import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Meu Financeiro',description:'Metas, gastos mensais e suas próximas reservas.',robots:{index:false,follow:false},icons:{icon:'/icon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
