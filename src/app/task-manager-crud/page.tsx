"use client";

import { supabase } from "@/src/supabase-client";
import { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

interface Task {
  id: number;
  title: string;
  email: string;
  description: string;
  created_at: string;
  image_url: string;
}

export default function TaskManagerCrud({ session }: { session: Session }) {
  // Note: To show a LIST of tasks, we should use an Array []
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [taskImage, setTaskImage] = useState<File | null>(null); // State to hold the uploaded image file

  const formRef = useRef<HTMLFormElement>(null);

  // 2. The FETCH function (Your image logic, snippet style)
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error reading tasks:", error.message);
        return;
      }

      // Use the setter you defined at the very beginning: setTasks
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error reading tasks:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  async function deleteTask(id: number) {
    if (!id) {
      console.error("Cannot delete a task without an ID! Try refreshing.");
      return;
    }

    //Remove from UI immediately (optimistic update)
    const previousTasks = [...tasks];
    setTasks(tasks.filter((task) => task.id !== id));

    // 3. CRITICAL FIX: Send ONLY the single object to Supabase
    // You were sending [newTask] (the whole array) before!
    const { error } = await supabase.from("tasks").delete().eq("id", id); // Use the single object here

    if (error) {
      console.error("Error adding task:", error);
      // 3. Rollback: If database fails, put the tasks back
      setTasks(previousTasks);
      alert("Could not delete task. Please try again.");
    }
    console.log("Deleted task with id: " + id);
  }

  async function updateTask(id: number, newDescription: string) {
    // 1. Update UI Optimistically
    const previousTasks = [...tasks];
    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, description: newDescription } : t,
      ),
    );

    // 2. Update Supabase
    const { error } = await supabase
      .from("tasks")
      .update({ description: newDescription }) // Pass the data here!
      .eq("id", id);

    if (error) {
      console.error("Update failed:", error);
      setTasks(previousTasks); // Rollback
    }

    setEditingId(null); // Close edit mode
  }
  async function uploadImage(file: File): Promise<string | null> {
    const filePath = `public/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("tasksImages")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error: ", error?.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = await supabase.storage.from("tasksImages").getPublicUrl(filePath);
    return publicUrl;
  }

  async function handleAddTask(formData: FormData) {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const taskImage = formData.get("image") as File | null;

    // 1. Mandatory Check: If no image, stop immediately
    if (!taskImage || taskImage.size === 0) {
      alert("Please select an image! (Required)");
      return;
    }

    setIsAdding(true);

    try {
      // 2. Upload the image
      const imageUrl = await uploadImage(taskImage);

      // 3. Check if upload actually gave us a URL
      if (!imageUrl) {
        throw new Error("Image upload failed. Please try again.");
      }

      // 4. Insert into DB (Now we are 100% sure imageUrl is NOT null)
      const { error } = await supabase.from("tasks").insert({
        title,
        description,
        image_url: imageUrl,
        email: session?.user?.email,
      });

      if (error) throw error;

      // Success! Clear the file state if you are using it
      formRef.current?.reset(); // This clears all inputs (text and file!)
      setTaskImage(null);
    } catch (error: any) {
      console.error("Error adding task:", error.message);
      alert("Failed to add task: " + error.message);
    } finally {
      setIsAdding(false);
    }
  }

  useEffect(() => {
    // 1. Initial Fetch
    fetchTasks();

    // 2. Setup Realtime
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" }, // Listen for all changes (*), not just INSERT
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTask = payload.new as Task;
            // Only add if it's not already in our list (prevents duplicates)
            setTasks((prev) =>
              prev.some((t) => t.id === newTask.id) ? prev : [newTask, ...prev],
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
            );
          }
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status: ", status);
      });

    // 3. CLEANUP: This is the most important part!
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array means this runs ONCE when the component starts

  console.log(tasks);

  return (
    <section className="h-fit p-4 rounded-lg grid justify-self-center self-center bg-[#212121] w-full max-w-md">
      <h1 className="text-white font-bold mb-4 text-center">
        Task Manager CRUD
      </h1>
      <p className="text-white text-sm font-semibold italic justify-self-center">
        All Input are required!
      </p>

      {/* FIX: Use curly braces for the function variable */}
      <form
        ref={formRef}
        className="space-y-4 p-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await handleAddTask(formData);
        }}
      >
        <div>
          <label
            className="disabled:opacity-50 text-white block text-sm font-medium mb-1"
            htmlFor="title"
          >
            Title:
          </label>
          <input
            disabled={isAdding}
            className="disabled:opacity-50 text-white w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 focus:ring-2 focus:ring-white outline-none"
            type="text"
            name="title"
            id="title"
            placeholder="Task title"
            required
          />
        </div>

        <div>
          <label
            className="disabled:opacity-50 text-white block text-sm font-medium mb-1"
            htmlFor="description"
          >
            Description:
          </label>
          <input
            disabled={isAdding}
            className="disabled:opacity-50 text-white w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 focus:ring-2 focus:ring-white outline-none"
            type="text"
            name="description"
            id="description"
            placeholder="Task description"
          />
        </div>

        {isAdding ? (
          <button
            disabled
            className="w-full py-2 bg-gray-400 text-black font-bold rounded-lg flex items-center justify-center gap-2"
            type="button"
          >
            {/* This div is the actual spinner */}
            <div className="w-5 h-5 border-2 justify-self-center border-black border-t-white rounded-full animate-spin"></div>
          </button>
        ) : (
          <>
            <input
              disabled={isAdding}
              className="disabled:opacity-50 w-full text-white cursor-pointer px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 focus:ring-2 focus:ring-white outline-none"
              type="file"
              accept="image/*"
              name="image"
              required
            />

            <button
              className="but w-full py-2 bg-white text-black font-bold rounded-lg mt-2"
              type="submit"
            >
              Add Task
            </button>
          </>
        )}
      </form>

      <div className="tasklist mt-6">
        {isLoading ? (
          <p className="text-white text-center animate-pulse">
            Loading tasks...
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-center">
            No tasks found. Add one above!
          </p>
        ) : (
          <ul className="space-y-3">
            {/* Loop through the tasks so they actually appear on screen */}
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col p-4 border items-center rounded border-gray-600 bg-gray-800"
              >
                <h2 className="text-base text-white font-semibold">
                  {task.title}
                </h2>

                {editingId === task.id ? (
                  <div className="flex flex-col gap-2 w-full">
                    <img
                      src={task.image_url}
                      alt={task.title}
                      className="rounded shadow-md my-2"
                    />
                    <textarea
                      id={`edit-${task.id}`}
                      className="p-2 bg-gray-700 text-white rounded mt-2"
                      defaultValue={task.description}
                    />
                    <div className=" flex gap-2">
                      <button
                        onClick={() => {
                          const val = (
                            document.getElementById(
                              `edit-${task.id}`,
                            ) as HTMLTextAreaElement
                          ).value;
                          updateTask(task.id, val);
                        }}
                        className="cursor-pointer bg-green-600 px-3 py-1 rounded text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer bg-gray-600 px-3 py-1 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm text-center">
                      {task.description}
                    </p>
                    <img
                      src={task.image_url}
                      alt={task.title}
                      className="rounded shadow-md my-2"
                    />
                    <div className="actions flex gap-2 mt-2">
                      <button
                        onClick={() => setEditingId(task.id)}
                        className="but px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="but px-3 py-1 text-xs bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
