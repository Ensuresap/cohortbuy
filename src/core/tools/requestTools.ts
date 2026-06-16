import { CreateRequestInput, RequestIdInput } from "../requests/domain/request";
import {
  createServiceRequest,
  joinServiceRequest,
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
