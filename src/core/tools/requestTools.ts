import {
  CreateRequestInput,
  RequestIdInput,
  AdvanceStatusInput,
} from "../requests/domain/request";
import {
  createServiceRequest,
  joinServiceRequest,
  advanceStatus,
} from "../requests/services/requestService";
import type { Tool } from "./types";

export const createServiceRequestTool: Tool = {
  name: "create_service_request",
  description: "Start a project in a cohort (the creator becomes coordinator).",
  input: CreateRequestInput,
  handler: (ctx, input) => createServiceRequest(ctx, input),
};

export const joinServiceRequestTool: Tool = {
  name: "join_service_request",
  description: "Join a cohort project as a participant.",
  input: RequestIdInput,
  handler: (ctx, input) => joinServiceRequest(ctx, input),
};

export const advanceRequestStatusTool: Tool = {
  name: "advance_request_status",
  description: "Move a project to a new lifecycle stage (coordinator/manager only).",
  input: AdvanceStatusInput,
  handler: (ctx, input) => advanceStatus(ctx, input),
};
