; Comments
(comment) @comment

; Strings
(double_quoted_string) @string
(single_quoted_string) @string
(ansi_c_string) @string

; Variables and expansions
(variable_name) @variable
(variable_expansion) @variable
(parameter_expansion) @variable.parameter
(arithmetic_expansion) @embedded
(command_substitution) @embedded
(process_substitution) @embedded
(parameter_flags) @attribute
(parameter_operator) @operator
(glob_qualifier) @attribute

; Commands and functions
(simple_command
  (command_name) @function.call)

(function_definition
  name: (command_name) @function)

; Keywords
(precommand) @keyword
[
  "if"
  "then"
  "else"
  "elif"
  "fi"
  "[["
  "]]"
  "for"
  "foreach"
  "while"
  "until"
  "repeat"
  "do"
  "done"
  "case"
  "esac"
  "select"
  "function"
  "coproc"
  "nocorrect"
  "end"
] @keyword

; Operators and delimiters
(redirect_operator) @operator
(conditional_operator) @operator
(test_operator) @operator

(list_operator) @operator
(bang) @operator
[
  "|"
  "&&"
  "||"
  ";"
  ";;"
  "&"
  "(("
  "))"
  "$(("
  "$["
] @operator

[
  "("
  ")"
  "{"
  "}"
] @punctuation.bracket
