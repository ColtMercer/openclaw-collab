import mongoose, { Schema, type Model, Types } from "mongoose"

export type CommentDocument = {
  articleId: Types.ObjectId
  paragraphIndex: number
  content: string
  resolved: boolean
  createdAt: Date
}

const CommentSchema = new Schema<CommentDocument>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: "Article", required: true },
    paragraphIndex: { type: Number, required: true },
    content: { type: String, required: true },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Comment: Model<CommentDocument> =
  mongoose.models.Comment || mongoose.model("Comment", CommentSchema)
