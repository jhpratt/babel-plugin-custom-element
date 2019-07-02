import * as Babel from '@babel/core';
import { ClassDeclaration } from '@babel/types';

/**
 * Rename `CustomElement` superclass to `HTMLElement`.
 *
 * @param t Babel type helper
 * @param class_path Path to the class declaration
 */
export function rename_superclass(
    { t }: { t: typeof Babel.types },
    class_path: Babel.NodePath<ClassDeclaration>,
): void {
    class_path.get('superClass').replaceWith(t.identifier('HTMLElement'));
}
