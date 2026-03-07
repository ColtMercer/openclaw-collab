import SocialClient from "@/app/social/SocialClient"
import {
  getSocialCollection,
  serializeSocialPost,
} from "@/lib/social-db"
import type { SocialPost } from "@/types"

export default async function SocialPage() {
  const collection = await getSocialCollection()
  const posts = await collection
    .find({})
    .sort({ created_at: -1 })
    .toArray()

  const serializedPosts = posts.map(serializeSocialPost) as SocialPost[]

  return <SocialClient initialPosts={serializedPosts} />
}
