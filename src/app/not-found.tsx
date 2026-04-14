export default function NotFound() {
    return (
        <section className="grid self-center bg-black h-full w-full">
            <div className="justify-self-center space-y-5 self-center"> 
                <h1 className="font-extrabold text-3xl text-white ">Page Not Found | 404</h1>
                <p className="text-white text-center">Could not find requested resource</p>
            </div>
        </section>
    )
}