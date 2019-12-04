const fetch = require('node-fetch');
const fs = require('fs');
const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const striptags = require('striptags');

function getFile(url, path) {
    const options = {
        redirect: 'error',
        headers: {
            'cookie': '_ym_uid=1575024026209495871; _ym_d=1575024026; _ga=GA1.2.1246168038.1575024026; _ym_isad=1; _gid=GA1.2.1995407082.1575344115; PHPSESSID=s83kl7mukme4uh4vvaf62mqbp3; _ym_visorc_32949839=w',
            'accept': 'application/json, text/plain, */*',
            'authority': 'mguu.miflib.ru'
        }
    }
    return new Promise(function(resolve, reject) {
        fetch(url, options)
        .then(res => {
            const dest = fs.createWriteStream(path);
            res.body.pipe(dest);
            resolve('ok');
        })
        .catch(err =>  {
            console.log(`ERROR: ${url} -> ${path}`);
            resolve('ok');
            //reject('error');
        });
    });
}

function getBook(book, rootDir) {
    const dir = rootDir + '/' + book.title.replace('/', '-');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    const promises = [];
    promises.push(getFile(book.img, dir + '/' + book.imgName).catch(e => {}));

    const description = book.small_description + "\n-----------------\n" + book.description;
    fs.writeFile(dir + '/description.txt', striptags(entities.decode(description)), (error) => {});
    fs.writeFile(dir + '/rawinfo.txt', JSON.stringify(book, null, 4), (error) => {});

    for (const item of book.files) {
        if (_.isNull(item.url)) {
            continue;
        }
        const path = dir + '/' + book.engName + '.' + item.type;
        if (fs.existsSync(path)) {
            console.log(`   ${book.title} ${item.type} существует, пропускаем`);
        } else {
            promises.push(getFile(item.url, path));
        }
    }
    return promises;
}

(async () => {
    process.stdout.write(`hello\n`);
    const books = JSON.parse(fs.readFileSync('list.json'))['books'];
    const count = books.length;
    for (let i = 0; i < count; i++) {
        console.log(`Обработка ${i} из ${count}`);
        if (!_.has(books[i], 'files.ebook')) {
            console.log(`ID: ${books[i].id}, ${books[i].title}: отсуствует ebook`);
            continue;
        }
        const files = books[i].files.ebook;
        const book = {
            'id': books[i].id,
            'title': books[i].title,
            'img'  : books[i].cover.large,
            'imgName': _.last(_.compact(books[i].cover.large.split('/'))),
            'engName': _.last(_.compact(books[i].mifUrl.split('/'))),
            'description': books[i].description,
            'small_description': _.get(books[i], 'stickers[0].text', ''),
            'files' : [
                {'type': 'fb2', 'url': _.get(files, 'fb2.url', null)},
                {'type': 'pdf', 'url':  _.get(files, 'pdf.url', null)},
                {'type': 'epub', 'url': _.get(files, 'epub.url', null)},
            ]
        }
        const promises = getBook(book, 'books_mguu');
        await Promise.all(promises);
    }
    process.stdout.write(`end\n`);
})();
