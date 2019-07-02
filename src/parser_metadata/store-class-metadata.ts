import * as Babel from '@babel/core';
import {
    BooleanLiteral,
    CallExpression,
    ClassDeclaration,
    StringLiteral,
    Decorator,
} from '@babel/types';
import { Key } from '../state_key';
import { generate_tag_name, validate_tag_name } from './tag-name';
import { State } from '..';

interface Data {
    t: typeof Babel.types;
    decorators: CallExpression[];
    state: State;
    klass: ClassDeclaration;
}

/**
 * Store `state.tag_name` if possible.
 *
 * @param t Babel type helper
 * @param decorators All decorators to check
 * @param state Class-wide state object
 * @param klass Class node
 * @returns Success state
 */
function store_tag_name({ t, decorators, state, klass }: Data): boolean {
    const tag_name = decorators
        .map(dec => dec.arguments)
        .filter(args => {
            if (!t.isStringLiteral(args[0]) || args.length !== 1) {
                console.warn(
                    '`@TagName` decorator on `CustomElement`s must have exactly'
                    + ' one parameter that is a string. Discarding decorator.',
                );
                return false;
            }
            return true;
        })
        .map(args => (args[0] as StringLiteral).value);
    if (tag_name.length > 1) {
        console.warn(
            'Multiple valid `@TagName` decorators found. Using last declared.',
        );
    }
    if (tag_name.length !== 0) {
        state[Key.tag_name] = tag_name[tag_name.length - 1];

        if (!validate_tag_name(state[Key.tag_name])) {
            throw new Error(
                `Invalid custom element tag name provided: \`${
                    state[Key.tag_name]
                }\``,
            );
        }
    } else {
        // I'm not entirely sure what could cause this situation to occur,
        // while the user would still be expecting a transformation.
        // If you have a valid use case, please file an issue and indicate
        // your expected result.
        if (klass.id === null) {
            return false;
        }
        state[Key.tag_name] = generate_tag_name(klass.id.name);
    }
    return true;
}

/**
 * Store `state.attributes` if possible.
 *
 * @param decorators All decorators to check
 * @param state Class-wide state object
 * @returns Success state
 */
function store_attributes({ t, decorators, state }: Data): boolean {
    // Find and verify `@Attr` decorators.
    state[Key.attributes] = (decorators
        .map(dec => dec.arguments)
        .filter(args => {
            if (args.length !== 1 && args.length !== 2) {
                console.warn(
                    '`@Attr` decorators on `CustomElement`s must have '
                    + 'one or two parameters. Discarding decorator.',
                );
                return false;
            }
            args.forEach(arg => {
                if (!t.isStringLiteral(arg)) {
                    throw new Error(
                        'Parameters in `@Attr` decorators must be string '
                        + 'literals.',
                    );
                }
            });
            return true;
        }) as unknown) as [StringLiteral, StringLiteral][];

    return true;
}

/**
 * Store `state.shadow_root` if possible.
 *
 * @param t Babel type helper
 * @param decorators All decorators to check
 * @param state Class-wide state object
 * @returns Success state
 */
function store_shadow_root({ t, decorators, state }: Data): boolean {
    const shadow_root = decorators
        .map(dec => dec.arguments)
        .filter(args => {
            if (args.length !== 1 || !t.isBooleanLiteral(args[0])) {
                console.warn(
                    '`@ShadowRoot` decorators on `CustomElement`s must '
                    + 'have exactly one parameter. Discarding decorator.',
                );
                return false;
            }
            return true;
        })
        .map(args => (args[0] as BooleanLiteral).value);

    if (shadow_root.length > 1) {
        console.warn(
            'Multiple valid `@ShadowRoot` decorators found. '
            + 'Using last declared.',
        );
    }
    if (shadow_root.length !== 0) {
        state[Key.shadow_root] = shadow_root[shadow_root.length - 1];
    } else {
        state[Key.shadow_root] = true;
    }

    return true;
}

/**
 * Gather metadata about the provided class.
 *
 * @param t Babel type helper
 * @param class_path.node Class to gather metadata on
 * @returns whether all metadata was successfully stored
 */
export function store_class_metadata(
    { t }: { t: typeof Babel.types },
    state: State,
    class_path: Babel.NodePath<ClassDeclaration>,
): boolean {
    // List all decorators potentially relevant.
    const decorators = (class_path.node.decorators || [])
        .filter(dec => t.isCallExpression(dec.expression))
        .map(dec => dec.expression as CallExpression);

    // Find and verify `@TagName` decorators.
    // If we find ourselves in a state that isn't an error but cannot continue,
    // return early with `null`.
    if (
        !store_tag_name({
            t,
            klass: class_path.node,
            state,
            decorators: decorators
                .filter(dec => t.isIdentifier(dec.callee, { name: 'TagName' })),
        })
    ) {
        return false;
    }

    // Find and verify `@Attr` decorators.
    // If we find ourselves in a state that isn't an error but cannot continue,
    // return early with `null`.
    if (
        !store_attributes({
            t,
            klass: class_path.node,
            state,
            decorators: decorators
                .filter(dec => t.isIdentifier(dec.callee, { name: 'Attr' })),
        })
    ) {
        return false;
    }

    // Find and verify `@ShadowRoot` decorators.
    // If we find ourselves in a state that isn't an error but cannot continue,
    // return early with `null`.
    if (
        !store_shadow_root({
            t,
            klass: class_path.node,
            state,
            decorators: decorators.filter(dec =>
                t.isIdentifier(dec.callee, { name: 'ShadowRoot' }),
            ),
        })
    ) {
        return false;
    }

    const all_decorators = class_path.get('decorators') as
        Babel.NodePath<Decorator>[] | Babel.NodePath<undefined>;

    // Remove all decorators processed.
    if (Array.isArray(all_decorators)) {
        all_decorators
            .filter(dec => t.isCallExpression(dec.node.expression))
            .forEach(dec => dec.remove());
    }

    return true;
}
