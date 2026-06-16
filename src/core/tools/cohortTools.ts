import {
  CreateCohortInput,
  RequestToJoinInput,
  ReviewJoinInput,
  SearchCohortsInput,
} from "../cohorts/domain/cohort";
import {
  createCohort,
  requestToJoin,
  reviewJoinRequest,
  searchPublicCohorts,
} from "../cohorts/services/cohortService";
import type { Tool } from "./types";

export const createCohortTool: Tool = {
  name: "create_cohort",
  description: "Create a cohort (the creator becomes its manager).",
  input: CreateCohortInput,
  handler: (ctx, input) => createCohort(ctx, input),
};

export const requestToJoinTool: Tool = {
  name: "request_to_join_cohort",
  description: "Request to join a cohort (pending manager approval).",
  input: RequestToJoinInput,
  handler: (ctx, input) => requestToJoin(ctx, input),
};

export const reviewJoinRequestTool: Tool = {
  name: "review_join_request",
  description: "Manager: approve, reject, or ask for more info on a join request.",
  input: ReviewJoinInput,
  handler: (ctx, input) => reviewJoinRequest(ctx, input),
};

export const searchPublicCohortsTool: Tool = {
  name: "search_public_cohorts",
  description: "Search public cohorts available to join.",
  input: SearchCohortsInput,
  handler: (ctx, input) => searchPublicCohorts(ctx, input),
};
