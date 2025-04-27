import { describe, it } from 'mocha'
import { joinPath, normalizeMdocPath } from '../util/uri'
import assert from 'assert'

describe('URI Utils', () => {
    it('should concatenate URIs correctly', () => {
        assert.strictEqual(joinPath('a', 'b'), 'a/b')
        assert.strictEqual(joinPath('a', 'b', 'c'), 'a/b/c')
        assert.strictEqual(joinPath('a/', 'b', 'c'), 'a/b/c')
        assert.strictEqual(joinPath('a/', '/b', 'c'), 'a/b/c')
    })
    
    it('should normalize mdoc paths correctly', () => {
        assert.strictEqual(normalizeMdocPath('a/b.md'), '/a/b.md')
        assert.strictEqual(normalizeMdocPath('/a/b.md'), '/a/b.md')
        assert.strictEqual(normalizeMdocPath('a%20b/c.md'), '/a b/c.md')
        assert.strictEqual(normalizeMdocPath('/a%20b/c.md'), '/a b/c.md')
    })
})