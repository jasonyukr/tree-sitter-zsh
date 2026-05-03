#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

enum TokenType {
  HEREDOC_START,
  HEREDOC_STRIP_START,
  HEREDOC_CONTENT,
  HEREDOC_END,
};

#define MAX_HEREDOCS 4
#define MAX_DELIMITER_LENGTH 128

typedef struct {
  char delimiter[MAX_DELIMITER_LENGTH];
  uint16_t length;
  bool strip_tabs;
} Heredoc;

typedef struct {
  Heredoc heredocs[MAX_HEREDOCS];
  uint8_t count;
} Scanner;

static bool is_heredoc_delimiter_char(int32_t c) {
  return c != '\0' && c != '\n' && c != '\r' && c != ' ' && c != '\t' &&
    c != ';' && c != '|' && c != '&' && c != '<' && c != '>' &&
    c != '(' && c != ')';
}

static void advance(TSLexer *lexer) {
  lexer->advance(lexer, false);
}

static bool push_heredoc(Scanner *scanner, const char *delimiter, uint16_t length, bool strip_tabs) {
  if (scanner->count == MAX_HEREDOCS || length == 0 || length >= MAX_DELIMITER_LENGTH) {
    return false;
  }

  Heredoc *heredoc = &scanner->heredocs[scanner->count++];
  memcpy(heredoc->delimiter, delimiter, length);
  heredoc->delimiter[length] = '\0';
  heredoc->length = length;
  heredoc->strip_tabs = strip_tabs;
  return true;
}

static void pop_heredoc(Scanner *scanner) {
  if (scanner->count > 0) {
    memmove(&scanner->heredocs[0], &scanner->heredocs[1], sizeof(Heredoc) * (scanner->count - 1));
    scanner->count--;
  }
}

static bool scan_heredoc_start(Scanner *scanner, TSLexer *lexer, bool strip_tabs) {
  char delimiter[MAX_DELIMITER_LENGTH];
  uint16_t length = 0;

  if (lexer->lookahead == '\'' || lexer->lookahead == '"') {
    int32_t quote = lexer->lookahead;
    advance(lexer);
    while (!lexer->eof(lexer) && lexer->lookahead != quote && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
      if (length + 1 >= MAX_DELIMITER_LENGTH) {
        return false;
      }
      delimiter[length++] = (char)lexer->lookahead;
      advance(lexer);
    }
    if (lexer->lookahead != quote) {
      return false;
    }
    advance(lexer);
  } else {
    if (!is_heredoc_delimiter_char(lexer->lookahead)) {
      return false;
    }
    do {
      if (length + 1 >= MAX_DELIMITER_LENGTH) {
        return false;
      }
      delimiter[length++] = (char)lexer->lookahead;
      advance(lexer);
    } while (is_heredoc_delimiter_char(lexer->lookahead));
  }

  if (!push_heredoc(scanner, delimiter, length, strip_tabs)) {
    return false;
  }

  lexer->mark_end(lexer);
  lexer->result_symbol = strip_tabs ? HEREDOC_STRIP_START : HEREDOC_START;
  return true;
}

static bool scan_heredoc_line(Scanner *scanner, TSLexer *lexer, const Heredoc *heredoc, bool can_end, bool can_content) {
  uint16_t index = 0;
  bool matches = true;

  if (lexer->eof(lexer)) {
    return false;
  }

  do {
    if (lexer->lookahead == '\r') {
      advance(lexer);
      if (lexer->lookahead == '\n') {
        advance(lexer);
      }
      break;
    }
    if (lexer->lookahead == '\n') {
      advance(lexer);
      break;
    }

    if (matches) {
      if (heredoc->strip_tabs && index == 0 && lexer->lookahead == '\t') {
        advance(lexer);
        continue;
      }

      if (index < heredoc->length && lexer->lookahead == heredoc->delimiter[index]) {
        index++;
      } else {
        matches = false;
      }
    }

    advance(lexer);
  } while (!lexer->eof(lexer));

  lexer->mark_end(lexer);
  if (matches && index == heredoc->length && can_end) {
    pop_heredoc(scanner);
    lexer->result_symbol = HEREDOC_END;
    return true;
  }

  if (can_content) {
    lexer->result_symbol = HEREDOC_CONTENT;
    return true;
  }
  return false;
}

void *tree_sitter_zsh_external_scanner_create(void) {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  return scanner;
}

void tree_sitter_zsh_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_zsh_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = payload;
  unsigned size = 0;

  buffer[size++] = (char)scanner->count;
  for (uint8_t i = 0; i < scanner->count; i++) {
    Heredoc *heredoc = &scanner->heredocs[i];
    buffer[size++] = (char)heredoc->length;
    buffer[size++] = heredoc->strip_tabs ? 1 : 0;
    memcpy(&buffer[size], heredoc->delimiter, heredoc->length);
    size += heredoc->length;
  }

  return size;
}

void tree_sitter_zsh_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = payload;
  memset(scanner, 0, sizeof(Scanner));
  if (length < 1) {
    return;
  }

  unsigned size = 0;
  scanner->count = (uint8_t)buffer[size++];
  if (scanner->count > MAX_HEREDOCS) {
    scanner->count = 0;
    return;
  }

  for (uint8_t i = 0; i < scanner->count; i++) {
    if (size + 2 > length) {
      scanner->count = i;
      return;
    }
    Heredoc *heredoc = &scanner->heredocs[i];
    heredoc->length = (uint8_t)buffer[size++];
    heredoc->strip_tabs = buffer[size++] != 0;
    if (heredoc->length >= MAX_DELIMITER_LENGTH || size + heredoc->length > length) {
      scanner->count = i;
      return;
    }
    memcpy(heredoc->delimiter, &buffer[size], heredoc->length);
    heredoc->delimiter[heredoc->length] = '\0';
    size += heredoc->length;
  }
}

bool tree_sitter_zsh_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = payload;

  if (
    valid_symbols[HEREDOC_START] &&
    valid_symbols[HEREDOC_STRIP_START] &&
    valid_symbols[HEREDOC_CONTENT] &&
    valid_symbols[HEREDOC_END]
  ) {
    return false;
  }

  if (scanner->count > 0) {
    Heredoc heredoc = scanner->heredocs[0];
    return scan_heredoc_line(scanner, lexer, &heredoc, valid_symbols[HEREDOC_END], valid_symbols[HEREDOC_CONTENT]);
  }

  if (valid_symbols[HEREDOC_START] && scan_heredoc_start(scanner, lexer, false)) {
    return true;
  }

  if (valid_symbols[HEREDOC_STRIP_START] && scan_heredoc_start(scanner, lexer, true)) {
    return true;
  }

  return false;
}
