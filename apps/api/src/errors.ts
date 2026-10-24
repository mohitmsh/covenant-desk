import { Data } from "effect"

export class AgentBusy extends Data.TaggedError("AgentBusy")<{ readonly reason: string }> {}

export class AgentUnavailable extends Data.TaggedError("AgentUnavailable")<{ readonly reason: string }> {}

export class InvalidUpload extends Data.TaggedError("InvalidUpload")<{ readonly reason: string }> {}
