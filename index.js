const through2 = require('through2').obj;
const path = require('path');
const File = require('vinyl');
const fs = require('fs');

const strOfSearch = {
    start: 'resolveDep',
    end: 'resolveDepEnd'
};
const commOfXML = {
    start:'(?:<!--.*?(?!-->))' + strOfSearch.start + '(?:.*?-->)',
    end: '(?:<!--.*?(?!-->))' + strOfSearch.end + '(?:.*?-->)'
};
const commOfMultiline = {
    start:'(?:/\\*.*?(?!\\*/))' + strOfSearch.start + '(?:.*?\\*/)',
    end: '(?:/\\*.*?(?!\\*/))' + strOfSearch.end + '(?:.*?\\*/)'
};
const commOfSingle = {
    start:'(?://.*)' + strOfSearch.start + '(?:.*)',
    end: '(?://.*)' + strOfSearch.end + '(?:.*)'
};

const regXMLComment = new RegExp(commOfXML.start + '([\\s\\S]*?)' + commOfXML.end, 'gim');
const regMlComment = new RegExp(commOfMultiline.start + '([\\s\\S]*?)' + commOfMultiline.end, 'gim');
const regSgComment = new RegExp(commOfSingle.start + '([\\s\\S]*?)' + commOfSingle.end, 'gim');

function getRegexes(exname){
    switch(exname){
        case '.html':
        case '.xml':
        case '.svg':
            return [regXMLComment];
        case '.js':
        case '.scss':
        case '.sass':
            return [regMlComment, regSgComment];
        case '.css':
        case '.txt':
        default:
            return [regMlComment];
            return null;
    }
}

let defaultOpt = {
    saveBase: false,
    cwd: process.cwd(),
    addFilesToStream: true,
    tranform: function(oldPath, newPath, saveBase){
        let oldPathStr = oldPath.dir + oldPath.base;
        let newPathStr = newPath.dir + newPath.base;

        return path.normalize(newPathStr + ( opt.saveBase ? oldPathStr : oldPath.base)); // base is name file
    }
    transformBlock: function(){
        // TO DO
    },
}

module.exports = function(userOpt){
    const opt = Object.assign({}, userOpt, defaultOpt);

    return through2(function(file, enc, callback){
        let self = this;
        let newContent = file.contents.toString(enc);
        let filePathRel = path.parse(file.path)
        let regexes = getRegexes(filePathRel.ext);

        if(!regexes) return callback(null, file);

        for(let i in regexes){
            newContent = newContent.replace(regexes[i], (fu, innerBlock)=>{
                return innerBlock.replace(/(['"])([\s\S]*?)(\1)/gi,(full, sc, oldPathStr)=>{
                    let oldPath = path.parse(oldPathStr);
                    let filePathStr = path.normalize( filePathRel.dir +'/'+ oldPathStr);
                    let newPath = path.normalize(opt[oldPath.ext.replace(/^\./,'')]);

                    if(!newPath) {
                        return full;
                    }

                    let newPathStr = opt.transform(oldPath, path.parse(newPath), opt.saveBase);

                    if (!opt.addFilesToStream) {
                        return sc + newPathStr + sc;
                    }

                    if (!fs.existsSync(filePathStr)) {
                        console.log(`File on path ${filePathStr} not found!`);
                        return full;
                    }

                    self.push(new File({
                        contents: fs.createReadStream(filePathStr),
                        cwd: opt.cwd,
                        path:  newPathStr,
                    }));

                    return sc + newPathStr + sc;
                });
            });
        }

        file.contents = new Buffer(newContent, enc);

        callback(null, file);
    });
}