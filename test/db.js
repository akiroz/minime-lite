const Datastore = require('nestdb');

module.exports = (srv) => {
    return require('../src/dbHelper')(
        Datastore({ filename: `minime_data_${srv}.db`, autoload: true })
    );
};