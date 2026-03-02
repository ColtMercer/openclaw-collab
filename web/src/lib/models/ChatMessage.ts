import mongoose, { Schema, type Model } from "mongoose"

export type ChatMessageDocument = {
  role: "user" | "assistant"
  content: string
  context: {
    path: string
    project?: string
  }
  createdAt: Date
}

const ChatMessageSchema = new Schema<ChatMessageDocument>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    context: {
      path: { type: String, required: true },
      project: { type: String },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const ChatMessage: Model<ChatMessageDocument> =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema)
