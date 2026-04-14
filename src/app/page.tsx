"use client";

import Link from "next/link";
import TaskManagerCrud from "./task-manager-crud/page";
import Auth from "./auth/page";
import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err) {
        console.error("Session fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // --- ADD THIS PART BELOW ---
    // This stays active and "listens" for logins/logouts
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth event detected:", _event);
      setSession(session);
      setLoading(false);
    });

    // Cleanup: stops the listener if the user leaves the page
    return () => subscription.unsubscribe();
  }, []);
  async function logout() {
    await supabase.auth.signOut();
    setSession(null); // Clear session on Logout
  }
  if (loading)
    return (
      <p className=" flex justify-center self-center text-white animate-pulse">
        Loading...
      </p>
    ); // Show a spinner or text while checking
  return (
    <>
      {session ? (
        <>
          <button className="but" onClick={() => logout()}>
            Log out
          </button>
          <TaskManagerCrud session={session}/>
        </>
      ) : (
        <Auth />
      )}
    </>
  );
}
