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
  ],

  rules: {
    source_file: $ => seq(
      repeat($.terminated_statement),
      optional($.list),
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
        optional($.list),
        choice($._terminator, $.comment),
      )),
    ),

    list: $ => prec.left(PREC.list, seq(
      $.pipeline,
      repeat(seq($.list_operator, $.pipeline)),
    )),

    pipeline: $ => prec.left(PREC.pipeline, seq(
      optional($.bang),
      $._command,
      repeat(seq('|', optional('&'), $._command)),
    )),

    _command: $ => choice(
      $.if_statement,
      $.conditional_command,
      $.for_statement,
      $.while_statement,
      $.until_statement,
      $.case_statement,
      $.select_statement,
      $.repeat_statement,
      $.foreach_statement,
      $.function_definition,
      $.arithmetic_command,
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

    _command_part: $ => $._word,

    assignment: $ => prec.right(seq(
      field('name', alias($._assignment_name, $.variable_name)),
      optional($._word),
    )),

    _assignment_name: _ => token(seq(
      /[A-Za-z_][A-Za-z0-9_]*/,
      choice('+=', ':=', '='),
    )),

    redirect: $ => prec.right(choice(
      $._heredoc_redirect,
      seq(
        optional(/[0-9]+/),
        $.redirect_operator,
        optional(choice(alias(token.immediate(/[0-9]+/), $.word), $._word)),
      ),
    )),

    redirect_operator: _ => token(choice(
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
    )),

    heredoc_operator: _ => token(prec(1, choice('<<-', '<<'))),

    _heredoc_redirect: $ => seq(
      optional(/[0-9]+/),
      alias($.heredoc_operator, $.redirect_operator),
      $.heredoc_start,
    ),

    heredoc_start: _ => token(prec(10, /[A-Za-z_][A-Za-z0-9_]*/)),

    heredoc_body: $ => seq(
      $.heredoc_content,
      $.heredoc_end,
    ),

    heredoc_content: _ => token(/[^\n]*\r?\n/),

    heredoc_end: _ => token(/[\t ]*[A-Za-z_][A-Za-z0-9_]*\r?\n?/),

    precommand: _ => choice(
      'nocorrect',
      'coproc',
      'command',
      'exec',
      'builtin',
      '-',
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

    case_statement: $ => seq(
      'case',
      $._word,
      choice('in', '('),
      repeat($._terminator),
      repeat(seq($.case_item, repeat($._terminator))),
      'esac',
    ),

    case_item: $ => prec.right(seq(
      optional('('),
      $.case_pattern,
      ')',
      repeat($._statement),
      optional(choice(';;', ';&', ';|')),
    )),

    case_pattern: $ => seq(
      $._word,
      repeat(seq('|', $._word)),
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

    function_definition: $ => prec(PREC.command + 1, choice(
      seq(
        'function',
        repeat1(field('name', $.command_name)),
        optional(seq('(', ')')),
        choice($.block, $.subshell),
      ),
      seq(
        field('name', $.command_name),
        '(',
        ')',
        choice($.block, $.subshell),
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

    command_substitution: $ => choice(
      seq('$(', repeat($._statement), ')'),
      seq('`', repeat(choice(token.immediate(/[^`\\]+/), $.escape_sequence)), '`'),
    ),

    process_substitution: $ => seq(
      choice('<(', '>(', '=('),
      repeat($._statement),
      ')',
    ),

    arithmetic_command: $ => seq(
      '((',
      optional($.arithmetic_expression),
      '))',
    ),

    arithmetic_expansion: $ => choice(
      seq('$((', optional($.arithmetic_expression), '))'),
      seq('$[', optional($.arithmetic_expression), ']'),
    ),

    arithmetic_expression: _ => token.immediate(/[^;)\]\n]+/),

    conditional_command: $ => seq(
      '[[',
      optional($.conditional_expression),
      ']]',
    ),

    conditional_expression: $ => prec.left(seq(
      $._conditional_term,
      repeat(seq($.conditional_operator, $._conditional_term)),
    )),

    _conditional_term: $ => choice(
      $.conditional_group,
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
      $.double_quoted_string,
      $.single_quoted_string,
      $.ansi_c_string,
      $.parameter_expansion,
      $.variable_expansion,
      $.command_substitution,
      $.arithmetic_expansion,
      alias($.conditional_word, $.word),
      $.glob_pattern,
    ),

    conditional_word: _ => token(prec(2, /[^\s'"`$\\;&|<>(){}\]]+/)),

    parameter_expansion: $ => seq(
      '${',
      optional($.parameter_flags),
      choice(
        $._parameter_operation,
        repeat(choice(
          $.variable_name,
          $.command_substitution,
        )),
      ),
      '}',
    ),

    _parameter_operation: $ => seq(
      field('parameter', choice($.variable_name, $.parameter_expansion, $.command_substitution)),
      repeat1(choice(
        $._parameter_default,
        $._parameter_removal,
        $.parameter_substitution,
        $.parameter_slice,
      )),
    ),

    _parameter_default: $ => seq(
      $.parameter_operator,
      repeat($._parameter_part),
    ),

    _parameter_removal: $ => seq(
      alias($._parameter_removal_operator, $.parameter_operator),
      repeat($._parameter_part),
    ),

    parameter_substitution: $ => prec.right(seq(
      '/',
      repeat1(choice(alias($._parameter_substitution_part, $.word), $.variable_expansion, $.parameter_expansion, $.command_substitution)),
      optional(seq(
        '/',
        repeat(choice(alias($._parameter_substitution_part, $.word), $.variable_expansion, $.parameter_expansion, $.command_substitution)),
      )),
    )),

    parameter_slice: $ => prec.right(seq(
      ':',
      alias($._parameter_slice_part, $.word),
      optional(seq(':', optional(alias($._parameter_slice_part, $.word)))),
    )),

    parameter_operator: _ => token.immediate(choice(':-', ':=', ':?', ':+', '-', '=', '?', '+')),

    _parameter_removal_operator: _ => token.immediate(choice('##', '%%', '#', '%')),

    _parameter_part: $ => choice(
      alias($._word_fragment, $.word),
      $.variable_expansion,
      $.parameter_expansion,
      $.command_substitution,
      $.arithmetic_expansion,
    ),

    _parameter_substitution_part: _ => token.immediate(/[^/}\s'"`$\\;|&<>(){}=>]+/),

    _parameter_slice_part: _ => token.immediate(/[^:}\s'"`$\\;|&<>(){}=>]+/),

    parameter_flags: _ => seq(
      '(',
      repeat1(token.immediate(/[^)\s]+/)),
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
      )),
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

    glob_pattern: $ => seq(
      field('pattern', alias(token(prec(1, /[^\s'"`$\\;|&<>(){}=>]*[*?][^\s'"`$\\;|&<>(){}=>]*/)), $.word)),
      optional($.glob_qualifier),
    ),

    glob_qualifier: _ => token.immediate(seq('(', /[^)\s]+/, ')')),

    _word: $ => choice(
      $.glob_pattern,
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

    _word_fragment: _ => token.immediate(/[^\s'"`$\\;|&<>(){}=>]+/),

    variable_name: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    comment: _ => token(seq('#', /.*/)),

    line_continuation: _ => token(seq('\\', /\r?\n/)),

    escape_sequence: _ => token.immediate(seq('\\', /./)),

    list_operator: _ => choice('&&', '||', '&'),

    bang: _ => '!',

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
