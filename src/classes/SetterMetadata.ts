import { Expression } from '@babel/types';

/**
 * The possible types a property can be.
 */
export const enum PropertyType {
    Attribute,
    BooleanAttribute,
    Property,
    StaticTextNode,
    DynamicTextNode,
}

/**
 * Metadata for a single property.
 * Used to generate setters.
 */
interface SinglePropertyMetadata<T extends PropertyType = PropertyType> {
    jsx_attr_name: T extends
    | PropertyType.Attribute
    | PropertyType.BooleanAttribute
    | PropertyType.Property
        ? string
        : null;
    ref_number: number;
    type: T;
    expr: Expression;
}

interface PropertyMetadata {
    [key: string]: SinglePropertyMetadata[] | undefined;
}

/**
 * Metadata for _all_ setters, stored in a simple object.
 */
export class SetterMetadata {
    private _data: PropertyMetadata = Object.create(null);

    /**
     * @param jsx_attr_name The name of the attribute/property _on the element_.
     * @param class_prop_name The name of the property _in the class_.
     * @param ref_number The index of `#refs` to update when `class_prop_name`
     *   is changed.
     * @param type If the value is an attribute, boolean attribute, or property.
     */
    public add({
        jsx_attr_name,
        class_prop_name,
        ref_number,
        type,
        expr,
    }: SinglePropertyMetadata & { class_prop_name: string }): void {
        let data = this._data[class_prop_name];

        if (data === undefined) {
            this._data[class_prop_name] = data = [];
        }

        // Don't duplicate properties.
        if (!data.some(prop => prop.jsx_attr_name === jsx_attr_name)) {
            data.push({ jsx_attr_name, ref_number, type, expr });
        }
    }

    /**
     * @param class_prop_name The name of the property _in the class_.
     * @returns All `SinglePropertyMetadata`s associated with the property,
     *   if any.
     */
    public get(class_prop_name: string): SinglePropertyMetadata[] | undefined {
        return this._data[class_prop_name];
    }
}
