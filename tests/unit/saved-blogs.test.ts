import { describe, it, expect } from "vitest";
import { useAppStore } from "@/lib/app-store";

describe("Saved Blog Posts Store", () => {
  it("saves a new blog post and assigns an id", () => {
    const store = useAppStore.getState();
    const id = store.saveBlogPost({
      title: "10 Proven Tips for Remote Teams",
      draft: "<p>Remote work requires intentional communication...</p>",
      metaDescription: "Learn how to manage distributed teams effectively.",
      keywords: ["remote work", "management", "productivity"],
      source: "topic",
      sourceName: "Remote Teams Management",
      wordCount: 450,
    });

    expect(id).toBeDefined();
    const updated = useAppStore.getState();
    const post = updated.savedBlogs.find((b) => b.id === id);
    expect(post).toBeDefined();
    expect(post?.title).toBe("10 Proven Tips for Remote Teams");
    expect(post?.wordCount).toBe(450);
  });

  it("updates an existing blog post when id is provided", () => {
    const store = useAppStore.getState();
    const id = store.saveBlogPost({
      title: "Initial Draft Title",
      draft: "<p>Initial content</p>",
      source: "blank",
      wordCount: 100,
    });

    store.saveBlogPost({
      id,
      title: "Refined Draft Title",
      draft: "<p>Updated content with more detail</p>",
      source: "blank",
      wordCount: 250,
    });

    const updated = useAppStore.getState();
    const post = updated.savedBlogs.find((b) => b.id === id);
    expect(post?.title).toBe("Refined Draft Title");
    expect(post?.wordCount).toBe(250);
  });

  it("deletes a saved blog post by id", () => {
    const store = useAppStore.getState();
    const id = store.saveBlogPost({
      title: "Post to be Deleted",
      draft: "<p>Temporary</p>",
      source: "topic",
      wordCount: 50,
    });

    expect(useAppStore.getState().savedBlogs.some((b) => b.id === id)).toBe(true);

    store.deleteBlogPost(id);
    expect(useAppStore.getState().savedBlogs.some((b) => b.id === id)).toBe(false);
  });

  it("loads a saved blog post into the blog editor composer", () => {
    const store = useAppStore.getState();
    const id = store.saveBlogPost({
      title: "Marketing Automation 101",
      draft: "<p>Automation saves hours of repetitive tasks.</p>",
      metaDescription: "Guide to marketing automation",
      keywords: ["marketing", "automation"],
      source: "project",
      sourceName: "SaaS Playbook",
      projectId: "proj_123",
      wordCount: 300,
    });

    store.loadSavedBlog(id);

    const updated = useAppStore.getState();
    expect(updated.blog.source).toBe("project");
    expect(updated.blog.title).toBe("Marketing Automation 101");
    expect(updated.blog.draft).toBe("<p>Automation saves hours of repetitive tasks.</p>");
    expect(updated.blog.projectId).toBe("proj_123");
    expect(updated.blog.metaDescription).toBe("Guide to marketing automation");
    expect(updated.blog.keywords).toEqual(["marketing", "automation"]);
  });
});
