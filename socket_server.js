//socket server setup
const app = require("./app")
const http = require("http");
const httpServer = http.createServer(app);
httpServer.listen(8080, ()=> console.log("socket listening on port 8080"));

const webSocketServer = require("websocket").server;

const wsServer = new webSocketServer({
    httpServer
})

//get random ids
let randId = () => {
    let s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

let clients = []

let clientsNames = []

let messages = []

module.exports = wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);

    if(clients.length > 10) connection.close()

    const clientId = randId();
    clients.push({
        "clientId": clientId,
        "connection": connection
    })
    
    connection.on("connection", () =>  console.log("opened"))

    connection.on("close", () => {
        console.log(clients)
        clients = clients.filter(client => client.clientId !== clientId)
        clientsNames = clientsNames.filter(client => client.clientId !== clientId)
        console.log(clients)
        console.log("closed!!")
        clearInterval(intervalId)
    })

    const payLoad = {
        "method": "connect",
        "clientId": clientId,
        "content": messages,
    }
    connection.send(JSON.stringify(payLoad))

    const intervalId = setInterval(() => {
        const payLoad2 = {
            "method": "details",
            "onlineClients": clientsNames 
        }
        connection.send(JSON.stringify(payLoad2))
    }, 3000);

    connection.on("message", (data) => {
        const msg = JSON.parse(data.utf8Data)
        
        if(msg.method === "newMessage") {
            if(messages.length > 10){
                messages.shift()
            }
            messages.push({
                "clientId": msg.clientId,
                "content": msg.content,
                "messageId": msg.messageId,
                "date": msg.date
            })

            const payLoad = {
                "method": "sendMessages",
                "content": messages
            }
            clients.forEach(client => client.connection.send(JSON.stringify(payLoad)))
        }

        if(msg.method === "deleteMessage") {
            messages = messages.filter(message => message.messageId !== msg.messageId)
            const payLoad = {
                "method": "sendMessages",
                "content": messages
            }
            clients.forEach(client => client.connection.send(JSON.stringify(payLoad)))
        }

        if(msg.method === "setName"){
            clientsNames.push({
                "clientId": msg.clientId,
                "name": msg.clientName
            })
        }

    })
})

