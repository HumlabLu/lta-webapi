import mongoose, { mongo, Schema } from "mongoose";
import { Z_DATA_ERROR } from "zlib";

const UserSchema = new mongoose.Schema(
  {
    userId: String,
    timezone: String,
    deviceToken: String,
    versionNumber: String,
    os: String
  }, {
    timestamps: true
  }
)
export const User = mongoose.model("User", UserSchema);


const GroupSchema = new mongoose.Schema(
  {
    groupId: String,
    userIds: [String],
  }, {
    timestamps: true
  }
)

export const Group = mongoose.model("Group", GroupSchema);

const QuestionSchema = new mongoose.Schema(
  {
    index: Number,
    id: String,
    title: String,
    text: String,
    type: String,
    minAnnotation: String,
    maxAnnotation: String,
    values: [String],
    description: String,
    skip: {
      ifChosen: Number,
      goto: Number
    },
    includeIf: {
      ifIndex: Number,
      ifValue: Number
    }
  }
)

const SurveySchema = new mongoose.Schema(
  {
    id: String, //deprecated

    name: String,
    title: String,
    assignedAt: Date, //depr
    publishedAt: Date, // depr
    publishNotificationTitle: String,
    publishNotificationBody: String,
    expiresAt: Date, // depr
    expireNotificationTitle: String,
    expireNotificationBody: String,
    questions: [QuestionSchema]
  }, {
    timestamps: true
  }
)

export const Survey = mongoose.model("Survey", SurveySchema);

const AnswerSchema = new mongoose.Schema(
  {
    index: Number,
    type: String,
    intValue: Number,
    multiValue: [Number],
    stringValue: String
  }
)

const DatasetSchema = new mongoose.Schema(
  {
    surveyId: String,
    answers: [AnswerSchema]
  }, {
    timestamps: true
  }
)
export const Dataset = mongoose.model("Dataset", DatasetSchema);

const AssignmentSchema = new mongoose.Schema(
  {
    userId: String,
    groupId: String,
    
    publishAt: Date,
    expireAt: Date,
    publishFrom: Date,
    publishTo: Date,

    publishNotifiedAt: Date,
    expireNotifiedAt: Date,
    firstOpenedAt: Date,
    lastOpenedAt: Date,

    survey: SurveySchema,

    dataset: DatasetSchema,
  }, {
    timestamps: true
  } 
)
export const Assignment = mongoose.model("Assignment", AssignmentSchema);

const AssignmentResultsSchema = new mongoose.Schema(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: "Assignment"
    },

    userId: String,

    publishAt: Date,
    expireAt: Date,

    publishNotifiedAt: Date,
    expireNotifiedAt: Date,
    firstOpenedAt: Date,
    lastOpenedAt: Date,

    dataset: DatasetSchema,
  }, {
    timestamps: true
  } 
)
export const AssignmentResults = mongoose.model("AssignmentResults", AssignmentResultsSchema);