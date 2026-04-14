"use client";

import { supabase } from "@/src/supabase-client";
// import Link from "next/link"
import { useState } from "react";


export default function Auth () {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

async function handleSubmit(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    if (isSignUp) {
        console.log("TRIPPING SIGN UP LOGIC"); // If you don't see this, email won't send
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: 'http://localhost:3000',
            },
        });

        if (error) {
            console.error("Sign up error:", error.message);
            alert(error.message);
        } else {
            console.log("Sign up successful, check Gmail:", data);
            alert("Confirmation email sent! Check your inbox.");
        }
    } else {
        console.log("TRIPPING SIGN IN LOGIC");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    }
}


    return (
        <form className="space-y-4 text-white h-fit p-4 rounded-lg grid justify-self-center self-center bg-[#212121] w-full max-w-md" action={handleSubmit}>
            <div className="head">
                <p>Please provide your credentials</p>
                <button className="..." type="submit">
                    {isSignUp ? "Sign Up" : "Sign In"}
                </button>
            </div>
            <div className="fill flex flex-col gap-4 my-4">
                <input className="text-white w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 focus:ring-2 focus:ring-white outline-none" type="email" name="email" placeholder="Email address" />
                <input className="text-white w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 focus:ring-2 focus:ring-white outline-none" type="password" name="password" placeholder="Password" />
            </div>
            <div className="actions gap-4 flex flex-col">
                <div className="remember text-base font-medium flex items-center gap-2">
                    <input type="checkbox" name="remember"/>
                    <label htmlFor="remember">Remember me</label>
                </div>
                <button 
                    className="text-white bg-black cursor-pointer font-bold hover:bg-blue-600 py-2 px-4 rounded-lg" 
                    type="submit"
                >
                    {isSignUp ? "Create Account" : "Sign In"}
                </button>
            </div>
            <div className="link">
                {isSignUp ? 
                    (<p>Already have an account? <span onClick={() => setIsSignUp(false)} className="cursor-pointer text-blue-600">Sign In</span></p>) :
                    (<p>Don't have an account? <span onClick={() => setIsSignUp(true)} className="cursor-pointer text-blue-600">Sign Up</span></p>)
                }
            </div>
            <div className="actions"></div>
            <div className="link"></div>
        </form>
    )
}