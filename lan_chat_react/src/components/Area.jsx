import React, { useEffect, useRef } from "react";
import { useState } from "react";
import './Area.css'

const Area = ()=>{
    const [messages,setMessages] = useState([])
    const [inputValue,setInputValue] = useState('')
    const socketRef = useRef(null)
    
    useEffect(() =>{
        const ws = new WebSocket('ws://localhost:8000')
        
        ws.onmessage=(event)=>{
            try {
                const data = JSON.parse(event.data)
                
                if (data.type === 'system') {
                    console.log('System:', data.message)
                } else if (data.type === 'history') {
                    setMessages(prev => [...prev, { 
                        text: data.message, 
                        type: data.sender === 'server' ? 'server' : 'client' 
                    }])
                } else if (data.type === 'message') {
                    setMessages(prev => [...prev, { 
                        text: data.message, 
                        type: data.sender === 'server' ? 'server' : 'client' 
                    }])
                }
            } catch (error) {
                console.error('Error parsing message:', error)
            }
        }
        
        socketRef.current = ws
        
        return () => {
            ws.close()
        }
    },[])

    const handleSend = ()=>{
        if(inputValue.trim() !== '' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN){
            socketRef.current.send(JSON.stringify({ message: inputValue }))
            setMessages([...messages, { text: inputValue, type: 'client' }])
            setInputValue('')
        }
    }

    return(
        <div className="container">
            <div className="chat-area">
                <div className="display-area">
                   {
                    messages.map((msg,index)=>(
                        <div key={index} className={msg.type === 'server' ? 'server-messages':'client-messages' }>{msg.text}</div>
                    ))
                   }
                    <div className="type-area">
                        <input type="text" className="text-area"  value={inputValue} placeholder="Enter your text here" onChange={(event)=>{
                            setInputValue(event.target.value)
                        }}/><button className="send-area" onClick={handleSend}>send</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Area;