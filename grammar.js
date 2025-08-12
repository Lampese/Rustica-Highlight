module.exports = grammar({
  name: 'mor',

  extras: $ => [
    /\s/,
    $.comment
  ],

  conflicts: $ => [
    [$.expression, $.function_call],
    [$.expression, $.constructor_call],
    [$.expression, $.method_call],
    [$._type, $.function_type],
    [$._type, $.handle_type],
    [$._type, $.parenthesized_type],
    [$.return_statement],
    [$.break_statement],
    [$.variable, $.function_call],
    [$.equal_statement, $.variable],
    [$.parenthesized_type, $.type_list],
    [$.binary_expression, $.handle_expression],
    [$.method_call, $.handle_expression],
    [$.match_pattern, $.constructor_pattern],
    [$.variable, $.method_call]
  ],

  rules: {
    // Program
    program: $ => repeat($._declaration),

    // Declarations
    _declaration: $ => choice(
      $.enum_declaration,
      $.effect_declaration,
      $.function_declaration,
      $.newline
    ),

    newline: $ => /\n+/,

    // Enum declaration
    enum_declaration: $ => seq(
      'enum',
      field('name', $.identifier_upper),
      field('type_parameters', optional($.type_parameters)),
      '{',
      field('fields', repeat($.enum_field)),
      '}'
    ),

    enum_field: $ => choice(
      field('name', $.identifier_upper),
      seq(
        field('name', $.identifier_upper),
        '(',
        field('types', $.type_list),
        ')'
      )
    ),

    // Effect declaration
    effect_declaration: $ => seq(
      'effect',
      field('name', $.identifier_upper),
      field('type_parameters', optional($.type_parameters)),
      '{',
      field('fields', repeat($.effect_field)),
      '}'
    ),

    effect_field: $ => seq(
      field('name', $.identifier_lower),
      '(',
      field('parameters', $.type_list),
      ')',
      '->',
      field('return_type', $._type)
    ),

    // Function declaration
    function_declaration: $ => seq(
      'fn',
      field('name', $.identifier_lower),
      field('type_parameters', optional($.type_parameters)),
      '(',
      field('parameters', optional($.function_parameters)),
      ')',
      field('return_type', optional($.type_annotation)),
      field('body', $.statement_block)
    ),

    function_parameters: $ => commaSep1($.function_parameter),

    function_parameter: $ => seq(
      field('name', $.identifier_lower),
      ':',
      field('type', $._type)
    ),

    type_parameters: $ => seq(
      '[',
      commaSep($.type_parameter),
      ']'
    ),

    type_parameter: $ => choice(
      seq(field('name', $.identifier_upper), ':', field('kind', $.identifier_upper)),
      field('name', $.identifier_upper)
    ),

    // Types
    _type: $ => choice(
      $.parenthesized_type,
      $.effect_type,
      $.function_type,
      $.handle_type,
      $.generic_type,
      $.simple_type
    ),

    parenthesized_type: $ => seq('(', $._type, ')'),

    effect_type: $ => seq(
      '<',
      field('effects', $.effect_list),
      '>',
      field('return_type', $._type)
    ),

    effect_list: $ => commaSep1($.effect),

    effect: $ => choice(
      field('name', $.identifier_upper),
      seq(
        field('name', $.identifier_upper),
        '[',
        field('parameters', $.type_list),
        ']'
      )
    ),

    function_type: $ => choice(
      seq(
        '(',
        field('parameters', $.type_list),
        ')',
        '->',
        field('return_type', $._type)
      ),
      seq(
        '(',
        field('parameter', $._type),
        '->',
        field('return_type', $._type),
        ')'
      )
    ),

    handle_type: $ => seq(
      '(',
      field('from', $._type),
      '~>',
      field('to', $._type),
      ')'
    ),

    generic_type: $ => seq(
      field('name', $.identifier_upper),
      '[',
      field('parameters', $.type_list),
      ']'
    ),

    simple_type: $ => field('name', $.identifier_upper),

    type_list: $ => commaSep1($._type),

    type_annotation: $ => seq('->', $._type),

    // Statements
    statement_block: $ => seq(
      '{',
      field('statements', repeat($.statement)),
      
      '}'
    ),

    statement: $ => choice(
      $.let_statement,
      $.equal_statement,
      $.return_statement,
      $.break_statement,
      $.expression_statement
    ),

    let_statement: $ => choice(
      seq('let', field('name', $.identifier_lower), '=', field('value', $.expression)),
      seq('let', field('name', $.identifier_lower), ':', field('type', $._type), '=', field('value', $.expression)),
      seq('let', 'mut', field('name', $.identifier_lower), '=', field('value', $.expression)),
      seq('let', 'mut', field('name', $.identifier_lower), ':', field('type', $._type), '=', field('value', $.expression))
    ),

    equal_statement: $ => seq(field('name', $.identifier_lower), '=', field('value', $.expression)),

    return_statement: $ => choice(
      'return',
      seq('return', field('value', $.expression))
    ),

    break_statement: $ => choice(
      'break',
      seq('break', field('value', $.expression))
    ),

    expression_statement: $ => choice(
      $.expression,
      seq($.expression, ';')
    ),

    // Expressions
    expression: $ => choice(
      $.parenthesized_expression,
      $.literal,
      $.variable,
      $.method_call,
      $.function_call,
      $.constructor_call,
      $.tuple_expression,
      $.binary_expression,
      $.if_expression,
      $.while_expression,
      $.match_expression,
      $.handle_expression,
      $.handler_expression,
      $.anonymous_function,
      $.statement_block,
      $.wildcard
    ),

    parenthesized_expression: $ => seq('(', $.expression, ')'),

    literal: $ => choice(
      $.number,
      $.string,
      $.unit
    ),

    number: $ => /\d+(\.\d+)?/,
    string: $ => /"[^"]*"/,
    unit: $ => '()',

    variable: $ => choice(
      field('name', $.identifier_lower),
      seq(field('module', $.identifier_upper), '::', field('name', $.identifier_lower))
    ),

    method_call: $ => choice(
      seq(
        field('object', $.expression),
        '::',
        field('method', $.identifier_lower),
        '(',
        field('arguments', $.expression_list),
        ')'
      ),
      seq(
        field('object', $.expression),
        '::',
        field('method', $.identifier_lower),
        '(',
        ')'
      ),
      seq(
        field('module', $.identifier_upper),
        '::',
        field('method', $.identifier_lower),
        '(',
        field('arguments', $.expression_list),
        ')'
      ),
      seq(
        field('module', $.identifier_upper),
        '::',
        field('method', $.identifier_lower),
        '(',
        ')'
      )
    ),

    function_call: $ => choice(
      seq(
        field('function', $.identifier_lower),
        '(',
        field('arguments', $.expression_list),
        ')'
      ),
      seq(
        field('function', $.identifier_lower),
        '(',
        ')'
      )
    ),

    constructor_call: $ => choice(
      seq(
        field('constructor', $.identifier_upper),
        '(',
        field('arguments', $.expression_list),
        ')'
      ),
      seq(
        field('module', $.identifier_upper),
        '::',
        field('constructor', $.identifier_upper),
        '(',
        field('arguments', $.expression_list),
        ')'
      )
    ),

    tuple_expression: $ => seq(
      '(',
      field('first', $.expression),
      ',',
      field('second', $.expression),
      repeat(seq(',', $.expression)),
      ')'
    ),

    binary_expression: $ => choice(
      prec.left(seq(field('left', $.expression), '+', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '-', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '*', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '/', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '%', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '==', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '!=', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '<=', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '>=', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '|>', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '||', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '&&', field('right', $.expression))),
      prec.left(seq(field('left', $.expression), '=', field('right', $.expression)))
    ),

    if_expression: $ => choice(
      seq('if', field('condition', $.expression), field('then', $.statement_block)),
      seq('if', field('condition', $.expression), field('then', $.statement_block), 'else', field('else', $.statement_block))
    ),

    while_expression: $ => choice(
      seq('while', field('condition', $.expression), field('body', $.statement_block)),
      seq('while', field('condition', $.expression), field('body', $.statement_block), 'else', field('else', $.statement_block))
    ),

    match_expression: $ => seq(
      'match',
      field('value', $.expression),
      '{',
      field('cases', repeat($.match_case)),
      '}'
    ),

    match_case: $ => seq(
      field('pattern', $.match_pattern),
      '=>',
      field('body', $.expression)
    ),

    match_pattern: $ => choice(
      $.identifier_upper,
      $.identifier_lower,
      $.constructor_pattern,
      $.tuple_pattern,
      $.wildcard
    ),

    constructor_pattern: $ => seq(
      field('constructor', $.identifier_upper),
      field('arguments', optional($.tuple_pattern))
    ),

    tuple_pattern: $ => seq(
      '(',
      commaSep($.pattern_element),
      ')'
    ),

    pattern_element: $ => choice(
      $.identifier_lower,
      $.identifier_upper,
      $.wildcard
    ),

    handle_expression: $ => seq(
      'handle',
      field('expression', $.expression),
      'with',
      field('handler', $.expression)
    ),

    handler_expression: $ => seq(
      'hn',
      '{',
      field('cases', repeat($.handler_case)),
      '}'
    ),

    handler_case: $ => choice(
      seq(
        field('name', $.identifier_lower),
        '(',
        field('arguments', $.expression_list),
        ')',
        '=>',
        field('body', $.expression)
      ),
      seq(
        field('name', $.identifier_lower),
        '(',
        ')',
        '=>',
        field('body', $.expression)
      )
    ),

    anonymous_function: $ => choice(
      seq('fn', '(', ')', '->', field('return_type', $._type), field('body', $.statement_block)),
      seq('fn', '(', field('parameters', $.function_parameters), ')', '->', field('return_type', $._type), field('body', $.statement_block)),
      seq('fn', field('type_parameters', $.type_parameters), '(', field('parameters', $.function_parameters), ')', '->', field('return_type', $._type), field('body', $.statement_block)),
      seq('fn', '(', ')', field('body', $.statement_block)),
      seq('fn', '(', field('parameters', $.function_parameters), ')', field('body', $.statement_block)),
      seq('fn', field('type_parameters', $.type_parameters), '(', field('parameters', $.function_parameters), ')', field('body', $.statement_block))
    ),

    wildcard: $ => '_',

    expression_list: $ => commaSep1($.expression),

    // Identifiers
    identifier_lower: $ => /[a-z_][a-zA-Z0-9_']*/,
    identifier_upper: $ => /[A-Z][a-zA-Z0-9_']*/,

    // Comments
    comment: $ => /\/\/.*/
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
} 