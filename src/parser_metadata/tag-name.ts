/**
 * Convert a given string to a valid custom element tag name.
 * Though the specifics are an implementation detail,
 * this currently works by transforming to kebab case
 * and prefixing `x-` if a hyphen is not present in the name.
 *
 * @param id The name of the class
 * @returns a valid custom element tag name
 */
export function generate_tag_name(id: string): string {
    let name = id
        .replace(/[a-z]([A-Z])+/g, m => `${m[0]}-${m.substring(1)}`)
        .toLowerCase();

    if (!name.includes('-')) {
        name = `x-${name}`;
    }

    if (!validate_tag_name(name)) {
        throw new Error(
            'Could not automatically derive a valid tag name for the custom '
            + `element ${id}. Please specify a tag name by using the `
            + '`@TagName` decorator',
        );
    }

    return name;
}

/**
 * Validates a potential tag name according to the
 * [WebComponents specification](http://w3c.github.io/webcomponents/spec/custom/#prod-potentialcustomelementname).
 *
 * @param tag_name A potential tag name to validate
 * @returns Is `tag_name` a valid custom element name?
 */
export function validate_tag_name(tag_name: string): boolean {
    const PCENChar = String.raw`[
        -
        .
        0-9
        _
        a-z
        \u{B7}
        \u{C0}-\u{D6}
        \u{D8}-\u{F6}
        \u{F8}-\u{37D}
        \u{37F}-\u{1FFF}
        \u{200C}-\u{200D}
        \u{203F}-\u{2040}
        \u{2070}-\u{218F}
        \u{2C00}-\u{2FEF}
        \u{3001}-\u{D7FF}
        \u{F900}-\u{FDCF}
        \u{FDF0}-\u{FFFD}
        \u{10000}-\u{EFFFF}
    ]`.replace(/\s+/g, '');

    const validation_regex = new RegExp(
        `^[a-z]${PCENChar}*-${PCENChar}*$`,
        'u',
    );

    const prohibited_names = Object.freeze([
        'annotation-xml',
        'color-profile',
        'font-face',
        'font-face-src',
        'font-face-uri',
        'font-face-format',
        'font-face-name',
        'missing-glyph',
    ]);

    return (
        validation_regex.test(tag_name) && !prohibited_names.includes(tag_name)
    );
}
