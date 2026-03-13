import { redirect } from "next/navigation";

export default function SummariesPage() {
    redirect("/chats?filter=Summary");
}
