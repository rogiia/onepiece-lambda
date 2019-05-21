const AWS = require('aws-sdk');
AWS.config.update({
    region: 'eu-west-1'
});
const S3 = new AWS.S3();

module.exports = {
    isVisited: function (id) {
        return new Promise((resolve, reject) => {
            S3.getObject({
                Bucket: 'onepiece-communicated',
                Key: 'visited'
            }, function (err, data) {
                if (err) {
                    reject(err);
                    return;
                }
                const body = data.Body.toString();
                const ids = body.replace(/[^a-zA-Z0-9,]/g, "").split(',');
                resolve(ids.includes(id));
            });
        });
    },
    markVisited: function (id) {
        return new Promise((resolve, reject) => {
            S3.getObject({
                Bucket: 'onepiece-communicated',
                Key: 'visited'
            }, (err, data) => {
                if (err) {
                    reject(err);
                }
                const body = data.Body.toString();
                S3.putObject({
                    Bucket: 'onepiece-communicated',
                    Key: 'visited',
                    Body: body + ',' + id,
                    ContentType: 'text/plain'
                }, (err, data) => {
                    if (err) {
                        console.error(err.stack);
                        reject(err);
                        return;
                    }
                    console.log('Updated visited successfully');
                    resolve();
                });
            });
        });
    }
}