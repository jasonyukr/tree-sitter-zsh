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

    terminated_statement: $ => prec(1, seq(
      optional($.list),
      choice($._terminator, $.comment),
    )),

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
      $.for_statement,
      $.while_statement,
      $.until_statement,
      $.case_statement,
      $.select_statement,
      $.repeat_statement,
      $.foreach_statement,
      $.function_definition,
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

    redirect: $ => prec.right(seq(
      optional(/[0-9]+/),
      $.redirect_operator,
      optional(choice(alias(token.immediate(/[0-9]+/), $.word), $._word)),
    )),

    redirect_operator: _ => token(choice(
      '<<<',
      '>>',
      '>|',
      '<>',
      '>&',
      '<&',
      '<<',
      '<',
      '>',
    )),

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

    for_statement: $ => seq(
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

    parameter_expansion: $ => seq(
      '${',
      optional($.parameter_flags),
      repeat(choice(
        $.variable_name,
        $._word_fragment,
        $.command_substitution,
      )),
      '}',
    ),

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

    word: _ => /[^\s'"`$\\;|&<>(){}=>]+/,

    _word: $ => choice(
      $.word,
      $.double_quoted_string,
      $.single_quoted_string,
      $.ansi_c_string,
      $.variable_expansion,
      $.parameter_expansion,
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
