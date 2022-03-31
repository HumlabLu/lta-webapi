import { Application } from 'express';
import { SurveyService } from './services/surveyApi.service';
import { CloudMessageService } from './services/cloudMessage.service';

export class Controller {
  private surveyService: SurveyService;
  private cloudMessageService: CloudMessageService;

  constructor(private app: Application) {
    this.surveyService = new SurveyService();
    this.cloudMessageService = new CloudMessageService();
    this.routes();
  }

  public routes() {

    /* misc */
    this.app.route('/api/ping').get(this.surveyService.getPingMessage);
    this.app.route('/api/survey').get(this.surveyService.exampleSurvey);

    /* survey */
    this.app.route('/api/surveys').get(this.surveyService.getAllSurveys);
    this.app.route('/api/surveys').post(this.surveyService.addNewSurvey);
    this.app.route('/api/surveys/search').get(this.surveyService.findSurveyByName);
    this.app.route('/api/surveys/:id')
      .get(this.surveyService.getSurveyById)
      .put(this.surveyService.updateSurvey)
      .delete(this.surveyService.deleteSurvey);

    /* assignment */
    this.app.route('/api/assignments').get(async (req, res) => { 
      this.surveyService.getAssignments(req, res, "publishedAt", null, null) 
    });
    this.app.route('/api/assignments/sorted/:sortby/filtered/:from/:to').get(async (req, res) => {
      this.surveyService.getAssignments(req, res, req.params.sortby, req.params.from, req.params.to)
    });
    this.app.route('/api/assignments/search').get(this.surveyService.findAssignmentBySurveyNameUserIdGroupId);
    this.app.route('/api/assignments/:aid').get(this.surveyService.getAssignment);
    this.app.route('/api/assignments/:aid/open').post(this.surveyService.postAssignmentOpened);
    this.app.route('/api/assignments/:aid').delete(this.surveyService.deleteAssignment);

    this.app.route('/api/users/:uid/assignments').get(async (req, res) => { this.surveyService.getAssignmentsOfUser(req, res, false) });
    this.app.route('/api/users/:uid/allassignments').get(async (req, res) => { this.surveyService.getAssignmentsOfUser(req, res, true) });
    this.app.route('/api/users/:uid/assignments').delete(this.surveyService.deleteAssignmentsOfUser);

    this.app.route('/api/groups/:gid/assignments').get(async (req, res) => { this.surveyService.getAssignmentsOfGroup(req, res) }); 

    this.app.route('/api/users/:uid/surveys/:sid').post(async (req, res) => {
      this.surveyService.scheduleSurveyForUserOnce(req, req.params.sid, req.params.uid, String(Math.floor((new Date()).getTime() / 1000)), res);
    });


    this.app.route('/api/assignmentresults').get(this.surveyService.getAllAssignmentResults)
    this.app.route('/api/assignmentresults/:arid').get(this.surveyService.getAssignmentResult)
    this.app.route('/api/assignmentresults/:arid').delete(this.surveyService.deleteAssignmentResult)

    this.app.route('/api/assignments/:aid/assignmentresults').get(async (req, res) => {this.surveyService.getAssignmentResultOfAssignment(req, res) });

    //TODO auth: needs refactoring

    this.app.route('/api/users/:uid/schedule/survey/:sid/:publishAtUnix').post(async (req, res) => {
      this.surveyService.scheduleSurveyForUserOnce(req, req.params.sid, req.params.uid, req.params.publishAtUnix, res);
    });
    this.app.route('/api/users/:uid/schedule/survey/:sid/:startYMD/:endYMD/:hours/:plusMinusRandomMinutes').post(async (req, res) => {
      var hoursArray: Array<string> = req.params.hours.split('+').filter(function (el) { return el.length != 0 });
      this.surveyService.scheduleSurveyForUser(req,
        req.params.sid,
        req.params.uid,
        req.params.startYMD,
        req.params.endYMD,
        hoursArray,
        +req.params.plusMinusRandomMinutes,
        res);
    });
    
    this.app.route('/api/groups/:gid/schedule/survey/:sid/:startYMD/:endYMD/:hours/:plusMinusRandomMinutes').post(async (req, res) => {
      var hoursArray: Array<string> = req.params.hours.split('+').filter(function (el) { return el.length != 0 });
      this.surveyService.createGroupAssignmentSeries(req,
        req.params.sid,
        req.params.gid,
        req.params.startYMD,
        req.params.endYMD,
        hoursArray,
        +req.params.plusMinusRandomMinutes,
        res);
    });

    this.app.route('/api/surveys/:sid/assignments').get(this.surveyService.getAssignmentsOfSurvey);
    this.app.route('/api/surveys/:sid/datasets').get(this.surveyService.getAllDatasetsOfSurvey);
    this.app.route('/api/surveys/:sid/datasets/csv').get(this.surveyService.getAllDatasetsOfSurveyCSV);
    this.app.route('/api/surveys/:sid/datasets/results/json').get(async (req, res) => { this.surveyService.getAllDatasetsOfSurvey_ar(req, res, "json") } );
    this.app.route('/api/surveys/:sid/datasets/results/csv').get(async (req, res) => { this.surveyService.getAllDatasetsOfSurvey_ar(req, res, "csv") } );

    /* dataset */
    this.app.route('/api/users/:uid/assignments/:aid/datasets').post(this.surveyService.addNewDataset);
    this.app.route('/api/assignments/:aid/datasets').post(this.surveyService.addNewDataset);

    /* user */
    this.app.route('/api/users').get(this.surveyService.getAllUsers);
    this.app.route('/api/users/search').get(this.surveyService.findUserByUserId);
    this.app.route('/api/users/:id').get(this.surveyService.getUserById);
    this.app.route('/api/users/:id').put(this.surveyService.updateUser);

    /* group */
    this.app.route('/api/groups/:id').post(this.surveyService.createGroup);
    this.app.route('/api/groups').get(this.surveyService.getAllGroups);
    this.app.route('/api/groups/:id').get(this.surveyService.getGroupById);
    this.app.route('/api/groups/user/:uid').get(this.surveyService.getGroupsOfUser);
    this.app.route('/api/groups/:gid').put(this.surveyService.updateGroup);
    this.app.route('/api/groups/:gid').delete(this.surveyService.deleteGroup);
  }
} 