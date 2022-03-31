import api from "./api";
import { PORT } from "./constants/surveyApi.constants";

api.listen(PORT, () => console.log(`Listening on port ${PORT}`));