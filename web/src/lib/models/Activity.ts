import mongoose, { Schema, type Model } from "mongoose"

export type ActivityDocument = {
  action: "created" | "status_changed"
  issueId: mongoose.Types.ObjectId
  issueTitle: string
  project: string
  fromStatus?: string | null
  toStatus?: string | null
  timestamp: Date
  actor: string
}

const ActivitySchema = new Schema<ActivityDocument>({
  action: { type: String, enum: ["created", "status_changed"], required: true },
  issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  issueTitle: { type: String, required: true },
  project: { type: String, required: true },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  timestamp: { type: Date, default: () => new Date() },
  actor: { type: String, default: "System" },
})

export const Activity: Model<ActivityDocument> =
  mongoose.models.Activity || mongoose.model("Activity", ActivitySchema)
