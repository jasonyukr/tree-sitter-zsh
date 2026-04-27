/**
 * @file Tree-sitter grammar for an MVP zsh parser.
 * @author Jason Yu
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  list: 1,
  pipeline: 2,
  command: 3,
};

const REDIRECT_OPERATORS = [
  '<<<',
  '&>>',
  '>>|',
  '>>!',
  '>&|',
  '<&-',
  '>&-',
  '<<-',
  '>>',
  '>|',
  '>!',
  '<>',
  '>&',
  '<&',
  '&>',
  '<<',
  '<',
  '>',
];

module.exports = grammar({
  name: 'zsh',

  extras: $ => [
    /[ \t\r\f]+/,
    $.line_continuation,
  ],

  conflicts: $ => [
    [$.simple_command],
    [$.simple_command, $._heredoc_simple_command],
    [$.command_name, $.foreach_statement],
    [$.command_substitution, $._statement],
    [$._parameter_body, $._parameter_operation],
    [$.function_definition, $._redirected_command],
  ],

  rules: {
    source_file: $ => seq(
      repeat($.terminated_statement),
      optional($._terminated_list),
    ),

    _statement: $ => choice(
      $.terminated_statement,
      $.list,
    ),

    terminated_statement: $ => choice(
      prec(2, seq(
        alias($._heredoc_list, $.list),
        $._terminator,
        $.heredoc_body,
      )),
      prec(1, seq(
        optional($._terminated_list),
        choice($._terminator, $.comment),
      )),
    ),

    _terminated_list: $ => prec(1, seq(
      $.list,
      optional($._job_terminator),
    )),

    list: $ => prec.left(PREC.list, seq(
      $.pipeline,
      repeat(seq($.list_operator, $.pipeline)),
    )),

    pipeline: $ => prec.left(PREC.pipeline, seq(
      optional($.bang),
      $._command,
      repeat(seq('|', optional('&'), repeat($._terminator), $._command)),
    )),

    _command: $ => choice(
      $.if_statement,
      $.conditional_command,
      $.test_command,
      $.for_statement,
      $.while_statement,
      $.until_statement,
      $.case_statement,
      $.select_statement,
      $.repeat_statement,
      $.foreach_statement,
      $.function_definition,
      $.arithmetic_command,
      $._redirected_command,
      $.subshell,
      $.block,
      $.simple_command,
    ),

    simple_command: $ => prec.right(PREC.command, choice(
      seq(
        repeat(choice($.assignment, $.redirect)),
        repeat($.precommand),
        $.command_name,
        repeat(choice($.assignment, $._command_part, $.redirect)),
      ),
      seq(
        repeat1(choice($.assignment, $.redirect, $.precommand)),
      ),
    )),

    _heredoc_list: $ => prec.left(PREC.list, seq(
      alias($._heredoc_pipeline, $.pipeline),
      repeat(seq($.list_operator, $.pipeline)),
    )),

    _heredoc_pipeline: $ => prec.left(PREC.pipeline, seq(
      optional($.bang),
      alias($._heredoc_simple_command, $.simple_command),
      repeat(seq('|', optional('&'), $._command)),
    )),

    _heredoc_simple_command: $ => prec.right(PREC.command, seq(
      repeat(choice($.assignment, $.redirect)),
      repeat($.precommand),
      $.command_name,
      repeat(choice($.assignment, $._command_part, $.redirect)),
      alias($._heredoc_redirect, $.redirect),
      repeat(choice($.assignment, $._command_part, $.redirect)),
    )),

    command_name: $ => $._word,

    _command_part: $ => choice(
      $._word,
      alias($._command_assignment_word, $.word),
    ),

    assignment: $ => prec.right(PREC.command + 1, seq(
      field('name', alias($._assignment_name, $.variable_name)),
      optional(choice($.array_assignment, alias($._assignment_brace_value, $.word), alias(token.immediate(/[0-9]+/), $.word), $._word)),
    )),

    _assignment_brace_value: _ => token.immediate(prec(2, /\$\{[^}\n]+\}[^\s'"`$\\;|&<>(){}=>]*\$\{[^}\n]+\}\}/)),

    array_assignment: $ => seq(
      token.immediate('('),
      repeat($._word),
      ')',
    ),

    _assignment_name: _ => token(seq(
      /[A-Za-z_][A-Za-z0-9_]*/,
      optional(seq('[', /[^\]\n]+/, ']')),
      choice('+=', ':=', '='),
    )),

    redirect: $ => prec.right(choice(
      $._herestring_redirect,
      $._heredoc_redirect,
      seq(
        optional(/[0-9]+/),
        $.redirect_operator,
        optional(choice(alias(token.immediate(/[0-9]+/), $.word), $._word)),
      ),
    )),

    redirect_operator: _ => token(prec(2, choice(
      ...REDIRECT_OPERATORS.map(operator => seq(/[0-9]+/, operator)),
      ...REDIRECT_OPERATORS,
    ))),

    heredoc_operator: _ => token(prec(3, choice('<<-', '<<'))),

    _herestring_redirect: $ => seq(
      optional(/[0-9]+/),
      alias($.herestring_operator, $.redirect_operator),
      choice(alias(token.immediate(/[0-9]+/), $.word), $._word),
    ),

    herestring_operator: _ => token(prec(4, '<<<')),

    _heredoc_redirect: $ => seq(
      optional(/[0-9]+/),
      alias($.heredoc_operator, $.redirect_operator),
      $.heredoc_start,
    ),

    heredoc_start: _ => token(prec(10, choice(
      /[A-Za-z_][A-Za-z0-9_]*/,
      seq("'", /[^'\n]+/, "'"),
      seq('"', /[^"\n]+/, '"'),
    ))),

    heredoc_body: $ => seq(
      repeat($.heredoc_content),
      $.heredoc_end,
    ),

    heredoc_content: _ => token(choice(
      /[\t ]*\r?\n/,
      /[\t ]*[a-z][A-Za-z0-9_]*\r?\n/,
      /[^\nA-Za-z_\t ][^\n]*\r?\n/,
      /[\t ]*[A-Za-z_][A-Za-z0-9_]*[^\nA-Za-z0-9_\r][^\n]*\r?\n/,
      /[\t ]*[0-9][^\n]*\r?\n/,
    )),

    heredoc_end: _ => token(/[\t ]*[A-Z_][A-Z0-9_]*\r?\n?/),

    precommand: _ => choice(
      'nocorrect',
      'coproc',
      'command',
      'exec',
      'builtin',
    ),

    if_statement: $ => seq(
      'if',
      $._statement_body,
      'then',
      repeat($._statement),
      repeat($.elif_clause),
      optional($.else_clause),
      'fi',
    ),

    elif_clause: $ => seq(
      'elif',
      $._statement_body,
      'then',
      repeat($._statement),
    ),

    else_clause: $ => seq(
      'else',
      repeat($._statement),
    ),

    for_statement: $ => choice(
      seq(
        'for',
        $.c_style_for_clause,
        $._do,
        repeat($._statement),
        'done',
      ),
      seq(
        'for',
        field('variable', $.variable_name),
        optional(seq(
          choice('in', '('),
          repeat($._word),
          optional(')'),
        )),
        $._do,
        repeat($._statement),
        'done',
      ),
    ),

    c_style_for_clause: $ => seq(
      '((',
      optional($.arithmetic_expression),
      ';',
      optional($.arithmetic_expression),
      ';',
      optional($.arithmetic_expression),
      '))',
    ),

    while_statement: $ => seq(
      'while',
      $._statement_body,
      'do',
      repeat($._statement),
      'done',
    ),

    until_statement: $ => seq(
      'until',
      $._statement_body,
      'do',
      repeat($._statement),
      'done',
    ),

    case_statement: $ => choice(
      prec(3, seq(
        'case',
        $._word,
        choice('in', '('),
        $.case_pattern,
        ')',
        $.list,
        $._case_terminator,
        'esac',
      )),
      seq(
        'case',
        $._word,
        choice('in', '('),
        repeat($._case_separator),
        optional(seq(
          $.case_item,
          repeat(seq(repeat1($._case_separator), $.case_item)),
          repeat($._case_separator),
        )),
        'esac',
      ),
    ),

    _case_separator: $ => choice(
      $._terminator,
      alias($._case_comment, $.comment),
    ),

    _case_comment: _ => token(prec(1, seq('#', /.*/))),

    _case_statement: $ => choice(
      seq($.list, alias($._case_comment, $.comment)),
      $.terminated_statement,
      $.list,
    ),

    case_item: $ => prec.right(2, seq(
      $._case_item_head,
      choice(
        $._case_terminator,
        prec.dynamic(1, seq($.list, alias($._case_comment, $.comment), repeat($._case_statement), $._case_terminator)),
        seq(repeat1($._case_statement), $._case_terminator),
        seq($.list, repeat($._case_statement), $._case_terminator),
      ),
    )),

    _case_item_head: $ => seq(
      optional('('),
      $.case_pattern,
      ')',
    ),

    _case_terminator: _ => prec(2, choice(';;', ';&', ';|')),

    case_pattern: $ => seq(
      $.case_pattern_word,
      repeat(seq('|', $.case_pattern_word)),
    ),

    case_pattern_word: $ => seq(
      $._case_pattern_part_initial,
      repeat($._case_pattern_part),
    ),

    _case_pattern_part_initial: $ => choice(
      $.double_quoted_string,
      $.single_quoted_string,
      $.ansi_c_string,
      $.variable_expansion,
      $.parameter_expansion,
      $.arithmetic_expansion,
      $.command_substitution,
      $.escape_sequence,
      alias(/[^\s'"`$\\;|&<>(){}=]+/, $.word),
    ),

    _case_pattern_part: $ => choice(
      alias($._case_double_quoted_string, $.double_quoted_string),
      alias($._case_single_quoted_string, $.single_quoted_string),
      $.escape_sequence,
      alias(token.immediate(/[^\s'"`$\\;|&<>(){}=]+/), $.word),
    ),

    _case_double_quoted_string: $ => seq(
      token.immediate('"'),
      repeat(choice(
        token.immediate(/[^"\\$`]+/),
        $.escape_sequence,
        $.variable_expansion,
        $.parameter_expansion,
        $.arithmetic_expansion,
        $.command_substitution,
        token.immediate('$'),
      )),
      token.immediate('"'),
    ),

    _case_single_quoted_string: _ => seq(
      token.immediate("'"),
      repeat(token.immediate(/[^']+/)),
      token.immediate("'"),
    ),

    select_statement: $ => seq(
      'select',
      field('variable', $.variable_name),
      optional(seq('in', repeat($._word))),
      $._do,
      repeat($._statement),
      'done',
    ),

    repeat_statement: $ => seq(
      'repeat',
      $._word,
      choice(
        seq('do', repeat($._statement), 'done'),
        $._command,
      ),
    ),

    foreach_statement: $ => prec(2, seq(
      'foreach',
      field('variable', $.variable_name),
      optional(seq('(', repeat($._word), ')')),
      optional($._terminator),
      repeat($._statement),
      'end',
    )),

    function_definition: $ => prec.right(PREC.command + 1, choice(
      seq(
        'function',
        repeat1(field('name', $.command_name)),
        optional(seq('(', ')')),
        choice($.block, $.subshell),
      ),
      seq(
        'function',
        choice($.block, $.subshell),
        repeat(choice($._command_part, $.redirect)),
      ),
      seq(
        field('name', $.command_name),
        '(',
        ')',
        choice($.block, $.subshell),
      ),
      seq(
        '(',
        ')',
        choice($.block, $.subshell),
        repeat(choice($._command_part, $.redirect)),
      ),
    )),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}',
    ),

    subshell: $ => seq(
      '(',
      repeat($._statement),
      ')',
    ),

    _redirected_command: $ => prec.right(PREC.command + 1, seq(
      choice($.subshell, $.block),
      repeat1($.redirect),
    )),

    command_substitution: $ => choice(
      prec(4, seq('$(', repeat($.list), alias($._heredoc_redirect, $.redirect), $._terminator, $.heredoc_body, ')')),
      prec(3, seq('$(', alias($._heredoc_list, $.list), $._terminator, $.heredoc_body, ')')),
      seq('$(', repeat($._statement), ')'),
      seq('`', repeat(choice(token.immediate(/[^`\\]+/), $.escape_sequence)), '`'),
    ),

    process_substitution: $ => seq(
      $._process_substitution_operator,
      repeat($._statement),
      ')',
    ),

    _process_substitution_operator: _ => token(prec(3, choice('<(', '>(', '=('))),

    arithmetic_command: $ => seq(
      '((',
      optional($.arithmetic_expression),
      '))',
    ),

    arithmetic_expansion: $ => choice(
      seq('$((', optional($.arithmetic_expression), '))'),
      seq('$((', alias($._nested_arithmetic_expression, $.arithmetic_expression), '))'),
      seq('$[', optional($._bracket_arithmetic_expression), ']'),
    ),

    arithmetic_expression: _ => token.immediate(/([^;)\n]|\)[^;)\n])+/),

    _nested_arithmetic_expression: _ => token.immediate(/[^;()\n]*\([^;()\n]*\)[^;)\n]*/),

    _bracket_arithmetic_expression: _ => token.immediate(/[^;\]\n]+/),

    conditional_command: $ => seq(
      '[[',
      optional($.conditional_expression),
      ']]',
    ),

    test_command: $ => seq(
      '[',
      optional($.conditional_expression),
      ']',
    ),

    conditional_expression: $ => prec.left(seq(
      $._conditional_term,
      repeat(seq($.conditional_operator, $._conditional_term)),
    )),

    _conditional_term: $ => choice(
      $.conditional_group,
      $.test_negated_expression,
      $.test_unary_expression,
      $.test_binary_expression,
      $._conditional_operand,
    ),

    conditional_group: $ => seq(
      '(',
      $.conditional_expression,
      ')',
    ),

    test_unary_expression: $ => seq(
      $.test_operator,
      $._conditional_operand,
    ),

    test_negated_expression: $ => prec(1, seq(
      $.bang,
      $._conditional_term,
    )),

    test_binary_expression: $ => prec.left(seq(
      $._conditional_operand,
      $.test_operator,
      $._conditional_operand,
    )),

    conditional_operator: _ => choice('&&', '||'),

    test_operator: _ => token(prec(3, choice(
      '==',
      '!=',
      '=~',
      '<=',
      '>=',
      '-eq',
      '-ne',
      '-lt',
      '-le',
      '-gt',
      '-ge',
      '-a',
      '-b',
      '-c',
      '-d',
      '-e',
      '-f',
      '-g',
      '-h',
      '-k',
      '-n',
      '-o',
      '-p',
      '-r',
      '-s',
      '-t',
      '-u',
      '-w',
      '-x',
      '-z',
      '-L',
      '-O',
      '-G',
      '-S',
      '=',
      '<',
      '>',
    ))),

    _conditional_operand: $ => choice(
      alias($._dollar_terminated_double_quoted_string, $.double_quoted_string),
      alias($.conditional_quoted_word, $.word),
      $.double_quoted_string,
      $.single_quoted_string,
      $.ansi_c_string,
      $.compound_word,
      alias(token(prec(4, '<->')), $.word),
      $.parameter_expansion,
      $.variable_expansion,
      $.command_substitution,
      $.arithmetic_expansion,
      alias($.conditional_word, $.word),
      $.glob_pattern,
    ),

    conditional_word: _ => token(prec(2, /[^\s'"`$;&|<>(){}\]]+/)),

    conditional_quoted_word: _ => token(prec(10, /[^\s'"`$;&|<>(){}\]]*"[^"\\$`\n]*"[^\s'"`$;&|<>(){}\]]*/)),

    parameter_expansion: $ => choice(
      seq(
        '${',
        $.parameter_flags,
        choice(
          $._parameter_operation,
          $._parameter_default,
          $._parameter_body,
        ),
        '}',
      ),
      seq(
        '${',
        choice(
          $._parameter_operation,
          $._parameter_body,
        ),
        '}',
      ),
    ),

    _parameter_body: $ => seq(
      repeat1(choice(
        $.variable_name,
        $.special_parameter,
        $.command_substitution,
      )),
      repeat($.parameter_subscript),
    ),

    _parameter_operation: $ => choice(
      seq(
        field('parameter', choice($.variable_name, $.special_parameter, $.parameter_expansion, $.command_substitution)),
        repeat($.parameter_subscript),
        repeat1(choice(
          $._parameter_default,
          $._parameter_removal,
          $.parameter_substitution,
          $.parameter_slice,
        )),
      ),
      seq(
        field('parameter', $.parameter_expansion),
        repeat1($.parameter_subscript),
      ),
    ),

    _parameter_default: $ => seq(
      $.parameter_operator,
      repeat($._parameter_part),
    ),

    _parameter_removal: $ => seq(
      alias($._parameter_removal_operator, $.parameter_operator),
      repeat(choice(alias($._parameter_removal_part, $.word), $._parameter_part)),
    ),

    parameter_substitution: $ => prec.right(seq(
      '/',
      optional('/'),
      repeat1(choice(alias($._parameter_substitution_part, $.word), $.escape_sequence, $.ansi_c_string, $.variable_expansion, $.parameter_expansion, $.command_substitution)),
      optional(seq(
        '/',
        repeat(choice(alias($._parameter_substitution_part, $.word), $.escape_sequence, $.ansi_c_string, $.variable_expansion, $.parameter_expansion, $.command_substitution)),
      )),
    )),

    parameter_slice: $ => prec.right(seq(
      ':',
      alias($._parameter_slice_part, $.word),
      optional(seq(':', optional(alias($._parameter_slice_part, $.word)))),
    )),

    parameter_operator: _ => token.immediate(choice(':-', ':=', ':?', ':+', '-', '=', '?', '+')),

    _parameter_removal_operator: _ => token.immediate(choice('##', '%%', '#', '%')),

    parameter_subscript: _ => token.immediate(seq('[', /[^\]\n]+/, ']')),

    _parameter_part: $ => choice(
      alias($._word_fragment, $.word),
      $.escape_sequence,
      $.ansi_c_string,
      $.variable_expansion,
      $.parameter_expansion,
      $.command_substitution,
      $.arithmetic_expansion,
    ),

    _parameter_substitution_part: _ => token.immediate(/[^/}\s'"`$\\;|&<>(){}=>]+/),

    _parameter_slice_part: _ => token.immediate(/[^:}\s'"`$\\;|&<>(){}=>]+/),

    _parameter_removal_part: _ => token.immediate(prec(1, /[^}\s'"`$\\;|<>(){}=>]+/)),

    parameter_flags: _ => seq(
      '(',
      token.immediate(/[^)]+/),
      ')',
    ),

    variable_expansion: $ => seq(
      '$',
      choice(
        $.variable_name,
        /[0-9#?@$!*_-]/,
      ),
    ),

    double_quoted_string: $ => seq(
      '"',
      repeat(choice(
        token.immediate(/[^"\\$`]+/),
        $.escape_sequence,
        $.variable_expansion,
        $.parameter_expansion,
        $.arithmetic_expansion,
        $.command_substitution,
        token.immediate('$'),
      )),
      '"',
    ),

    _dollar_terminated_double_quoted_string: _ => seq(
      '"',
      token.immediate(/[^"\\$`]+[$]/),
      '"',
    ),

    single_quoted_string: _ => seq(
      "'",
      repeat(token.immediate(/[^']+/)),
      "'",
    ),

    ansi_c_string: $ => seq(
      "$'",
      repeat(choice(token.immediate(/[^'\\]+/), $.escape_sequence)),
      "'",
    ),

    word: _ => /[^\s'"`$\\;|&<>(){}=>\x5b\x5d]+/,

    option_word: _ => token(prec(1, /--?[A-Za-z0-9][A-Za-z0-9._+/@%-]*[=:][A-Za-z0-9._+/@:%=-]*/)),

    _command_assignment_word: _ => token(prec(1, /[A-Za-z0-9_.+@%/]*-[A-Za-z0-9_.+@%/-]*=[^\s'"`$\\;|&<>(){}=>]+/)),

    special_parameter: _ => token.immediate(/[0-9#?@$!*_-]/),

    glob_pattern: $ => seq(
      field('pattern', alias(token(prec(1, /[^\s'"`$\\;|&<>(){}=>]*[*?][^\s'"`$\\;|&<>(){}=>]*/)), $.word)),
      optional($.glob_qualifier),
    ),

    glob_qualifier: _ => token.immediate(seq('(', /[^)\s]+/, ')')),

    _word: $ => choice(
      $.glob_pattern,
      $.option_word,
      alias($._brace_word, $.word),
      alias(token(prec(1, /[0-9]+/)), $.word),
      $.escape_sequence,
      $.word,
      $.double_quoted_string,
      $.single_quoted_string,
      $.ansi_c_string,
      $.variable_expansion,
      $.parameter_expansion,
      $.arithmetic_expansion,
      $.command_substitution,
      $.process_substitution,
    ),

    compound_word: $ => prec.right(1, seq(
      choice($.variable_expansion, $.parameter_expansion),
      repeat1(choice(
        alias($._word_fragment, $.word),
        $.escape_sequence,
        $.variable_expansion,
        $.parameter_expansion,
        $.arithmetic_expansion,
        $.command_substitution,
      )),
    )),

    _word_fragment: _ => token.immediate(/[^\s'"`$\\;|&<>(){}=>]+/),

    _brace_word: _ => token(seq('{', /[^\s'"`$\\;|&<>(){}=>\x5b\x5d]+/, '}')),

    variable_name: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    comment: _ => token(seq('#', /.*/)),

    line_continuation: _ => token(seq('\\', /\r?\n/)),

    escape_sequence: _ => token(seq('\\', /./)),

    list_operator: _ => choice('&&', '||', '&'),

    _job_terminator: $ => choice(
      alias('&', $.list_operator),
      alias('&!', $.list_operator),
    ),

    bang: _ => token(prec(4, '!')),

    _statement_body: $ => repeat1(choice(
      $.terminated_statement,
      $.list,
    )),

    _do: $ => choice(
      'do',
      seq($._terminator, 'do'),
    ),

    _terminator: _ => choice(';', /\n+/),
  },
});
