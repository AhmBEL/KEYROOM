"use client";

import { useParams } from "next/navigation";
import { ProjectView } from "@/components/demo/ProjectView";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectView id={id} />;
}
