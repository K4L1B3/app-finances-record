import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Meu Financeiro',description:'Metas, gastos mensais e suas próximas reservas.',robots:{index:false,follow:false},icons:{icon:'/icon.svg'}};
// ponytail: script inline roda antes da pintura para não piscar branco; sem isso precisaria de cookie + render no servidor.
const theme=`document.documentElement.dataset.theme=localStorage.tema||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')`;
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head><script dangerouslySetInnerHTML={{__html:theme}}/></head><body>{children}</body></html>;}
