import type {Metadata} from "next";
import "./globals.css";
import {Navbar} from "@/components/navbar";
export const metadata:Metadata={title:"Luxe Salon",description:"Book salon appointments online."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Navbar/>{children}</body></html>}