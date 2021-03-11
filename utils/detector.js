module.exports = {
    detectCodeBlock: function(comments) {
        var start = -1
        var end = -1
        comments.forEach(function(value) {
            if(value.value.includes('cfunend')) {
                end = value.loc.start.line - 1
            } else if(value.value.includes('cfun')) {
                start = value.loc.start.line - 1
            }
        });
        return [start, end]
    }
}
