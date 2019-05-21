const request = require('request');
const db = require('dropbox-stream');
const Telegram = require('./telegram-send-message');
const DROPBOX_TOKEN = process.env.DROPBOX_TOKEN;
const Visited = require('./visited');

const uploadFile = function (name, url) {
    return new Promise((resolve, reject) => {
        const up = db.createDropboxUploadStream({
            token: DROPBOX_TOKEN,
            path: '/' + name + '.zip',
            chunkSize: 1000 * 1024,
            autorename: true,
            mode: 'add'
        })
        .on('error', err => reject(err))
        .on('progress', res => console.log(res))
        .on('metadata', metadata => resolve(metadata));
        
        request({
            url,
            headers: {
                'User-Agent': 'request'
            }
        }).pipe(up);
    });
}

const sendMessage = function (message) {
    Telegram.setToken(process.env.TELEGRAM_TOKEN);
    Telegram.setRecipient(process.env.TELEGRAM_RECIPIENTS);
    Telegram.setMessage(message);
    Telegram.send();
};

function getPinnedPosts(body) {
    const result = [];
    for (let i = 0; i < body.data.children.length; i++) {
        const item = body.data.children[i].data;
        if (item.stickied) {
            result.push(item);
        } else {
            break;
        }
    }
    return result;
}

function isSpoilers(post) {
    return post.title.toLowerCase().includes('spoiler');
}

function isChapter(post) {
    return post.link_flair_text === 'Current Chapter';
}

function findJaiminisBoxLink(post) {
    const matches = post.selftext.match(/(https?:\/\/jaiminisbox.com\/[^)]+)/g);
    if (matches.length > 0) {
        return matches[0];
    }
    return null;
}

function snakeCasify(str) {
    return str.toLowerCase()
        .replace(/\s/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/-+/, '-');
};

const options = {
    url: 'https://www.reddit.com/r/onepiece/hot.json',
    headers: {
        'User-Agent': 'request'
    }
};

exports.handler = function () {
    console.log(`Requesting ${options.url}`);
    request(options, (error, response, body) => {
        if (error) {
            console.error(error);
            process.exit();
        }

        const pinned = getPinnedPosts(JSON.parse(body));
        console.log(`Found ${pinned.length} pinned posts`);
        pinned.forEach((post) => {
            if (isSpoilers(post)) {
                console.log('SPOILERS', post.url);
                Visited.isVisited(post.id)
                    .then((isv) => {
                        if (!isv) {
                            console.log('Marking ' + post.id + ' as visited');
                            Visited.markVisited(post.id);
                            sendMessage(`${post.title}: ${post.url}`);
                        }
                    })
                    .catch(err => console.error(err.stack));
            } else if (isChapter(post)) {
                const link = findJaiminisBoxLink(post);
                console.log('NEW CHAPTER', link);
                Visited.isVisited(post.id)
                    .then((isv) => {
                        if (!isv) {
                            console.log('Marking ' + post.id + ' as visited');
                            Visited.markVisited(post.id);
                            uploadFile(snakeCasify(post.title), link.replace('/read/', '/download/'))
                                .then((metadata) => {
                                    console.log(`Uploaded ${metadata.name} to Dropbox`);
                                    sendMessage(`${post.title}: https://www.dropbox.com/home/Apps/onepiece-rogi${metadata.path_lower}`);
                                })
                                .catch((err) => {
                                    console.error(err);
                                });
                        }
                    })
                    .catch(err => console.error(err.stack));
            }
        });
    });
};
