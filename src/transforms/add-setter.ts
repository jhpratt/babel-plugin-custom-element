import * as Babel from '@babel/core';
import {
    ClassDeclaration,
    Identifier,
    ClassMethod,
    Expression,
    Statement,
    ExpressionStatement,
    IfStatement,
    NumericLiteral,
    StringLiteral,
} from '@babel/types';
import { Key } from '../state_key';
import { PropertyType } from '../classes/SetterMetadata';
import { State } from '..';

/**
 * Add all setters to the class.
 *
 * @param t Babel type helper
 * @param state Class-wide state object
 * @param klass Class node
 */
export function add_setters(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
    klass: ClassDeclaration,
): void {
    const setter_metadata = state[Key.setter_metadata];
    const private_refs = t.privateName(t.identifier('refs'));

    /**
     * @param attr The name of the attribute to set
     * @param ref_number The index of `this.#refs` to modify
     * @param expr The expression that results in the value to set
     * @returns `ExpressionStatement` AST that sets an attribute
     */
    function set_attribute({
        attr,
        ref_number,
        expr,
    }: {
        attr: StringLiteral;
        ref_number: NumericLiteral;
        expr: Expression;
    }): ExpressionStatement {
        return (template.ast`
            this.${private_refs}[${ref_number}].setAttribute(${attr}, ${expr});
        ` as unknown) as ExpressionStatement;
    }

    /**
     * @param prop The name of the property to set
     * @param ref_number The index of `this.#refs` to modify
     * @param expr The expression that results in the value to set
     * @returns `ExpressionStatement` AST that sets a property
     */
    function set_property({
        prop,
        ref_number,
        expr,
    }: {
        prop: StringLiteral;
        ref_number: NumericLiteral;
        expr: Expression;
    }): ExpressionStatement {
        return (template.ast`
            this.${private_refs}[${ref_number}][${prop}] = ${expr};
        ` as unknown) as ExpressionStatement;
    }

    /**
     * @param attr The name of the boolean attribute to set
     * @param ref_number The index of `this.#refs` to modify.
     * @param expr The expression that results in the value to set
     * @returns `IfStatement` AST that sets a boolean attribute
     */
    function set_boolean_attribute({
        attr,
        ref_number,
        expr,
    }: {
        attr: StringLiteral;
        ref_number: NumericLiteral;
        expr: Expression;
    }): IfStatement {
        return (template.ast`
            if (${expr}) {
                this.${private_refs}[${ref_number}].setAttribute(${attr}, '');
            } else {
                this.${private_refs}[${ref_number}].removeAttribute(${attr});
            }
        ` as unknown) as IfStatement;
    }

    /**
     * @param ref_number The index of `this.#refs` to modify.
     * @param expr The expression that results in the value to set
     * @returns `ExpressionStatement` AST that sets the text content
     */
    function set_text_node({
        ref_number,
        expr,
    }: {
        ref_number: NumericLiteral;
        expr: Expression;
    }): ExpressionStatement {
        return template.ast`
            this.${private_refs}[${ref_number}].textContent = ${expr};
        ` as ExpressionStatement;
    }

    /**
     * Create and return a setter for the given class property.
     *
     * @param ident The class property to create the setter for
     * @returns A `ClassMethod` for setting the given public property
     */
    function setter(ident: Identifier): ClassMethod {
        const set_value = t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(t.thisExpression(), t.privateName(ident)),
                t.identifier('value'),
            ),
        );

        const body: Statement[] = [set_value];

        const props = setter_metadata.get(ident.name);
        if (props === undefined) {
            throw new Error(
                `Property '${ident.name}' is not used in \`static html\`, `
                + `but a setter is derived. If the property doesn't need to `
                + 'be used in `static html`, consider removing the derived '
                + 'setter',
            );
        }

        for (const { jsx_attr_name, ref_number, type, expr } of props) {
            if (type === PropertyType.Attribute) {
                body.push(
                    set_attribute({
                        attr: t.stringLiteral(jsx_attr_name as string),
                        ref_number: t.numericLiteral(ref_number),
                        expr,
                    }),
                );
            } else if (type === PropertyType.Property) {
                body.push(
                    set_property({
                        prop: t.stringLiteral(jsx_attr_name as string),
                        ref_number: t.numericLiteral(ref_number),
                        expr,
                    }),
                );
            } else if (type === PropertyType.BooleanAttribute) {
                body.push(
                    set_boolean_attribute({
                        attr: t.stringLiteral(jsx_attr_name as string),
                        ref_number: t.numericLiteral(ref_number),
                        expr,
                    }),
                );
            } else if (type === PropertyType.DynamicTextNode) {
                body.push(
                    set_text_node({
                        ref_number: t.numericLiteral(ref_number),
                        expr,
                    }),
                );
            }
        }

        return t.classMethod(
            'set',
            ident,
            [t.identifier('value')],
            t.blockStatement(body),
        );
    }

    for (const name of state[Key.need_setter].values()) {
        klass.body.body.push(setter(t.identifier(name)));
    }
}
