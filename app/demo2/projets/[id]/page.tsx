"use client";

import { useParams } from "next/navigation";
import { ProjectView2 } from "@/components/demo2/ProjectView2";

export default function Project2Page() {
  const { id } = useParams<{ id: string }>();
  return <ProjectView2 id={id} />;
}
