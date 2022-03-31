// import express, { Application } from 'express';
// import { WEBAPP_URL } from './constants/surveyApi.constants';
// var history = require('connect-history-api-fallback');

// class App {

//     public app: Application;

//     constructor() {
//         this.app = express();
//         this.app.use(history());

//         var cors = require('cors');
//         this.app.use(cors());
//         this.app.use(cors({
//             origin: WEBAPP_URL
//           }));

//         this.app.use('/app', express.static('public'));
//     }

// }

// export default new App().app;