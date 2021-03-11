const prettier = require('prettier')


module.exports = {
    indexAWS: function(comments) {
        return prettier.format(`

               module.exports.handler = async (event, context) => {

                 const userFunc = module.exports;
                 let res;
                 try {
                   res = await userFunc(event)
                 } catch(e) {
                   context.fail(e)
                 }
                 context.succeed(res)
               }
             `, { semi: false, parser: 'babel' }
            )
    }
}
