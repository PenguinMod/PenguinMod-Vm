const { Parser } = require("htmlparser2");
const { DomHandler } = require("domhandler");

module.exports = function(v) {
    let result;

    const handler = new DomHandler((error, dom) => {
        if (error) {
            throw new Error(`dom parser fail: ${error}`);
        } else {
            result = dom;
        }
    });

    const parser = new Parser(handler);
    parser.write(v);
    parser.end();

    return result;
}