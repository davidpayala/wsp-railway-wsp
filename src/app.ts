import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import db from './db.js'


// accesos meta wsp
const JWTTOKEN = process.env.JWTTOKEN ?? 'EAAH7KBbWZCk0BO9Mhmx25ZBhZBnMeXqx48ZAZB1qcBZARhYowE1mcxdzK69XuZARUg2DEbXHYtHN626LkVJ9pxtmPBQO4V3E515QwoKfYdQAF7LTzg6WrEXmZALIJMYqgLujZBtODnlGU1X9pKPl0gZC3Sly110iuQE3aqga5CHiSFUAolkXhcrbEU6tWgqyz8yMgB8j0SoAvaKAppt4KrCgJJZCbYOwkZBbXwYDvSTX30TBSwAZD'
const NUMBERID = process.env.NUMBERID ?? '456192744242041'
const VERIFYTOKEN = process.env.VERIFYTOKEN ?? 'Cheza1316$'
const VERSION = process.env.VERSION ?? 'v20.0'
// accesos db interna
const db = await mysql.createConnection({
    host: process.env.DB_HOST,  // Host proporcionado por Railway
    user: process.env.DB_USER,  // Usuario de la base de datos
    password: process.env.DB_PASSWORD,  // Contraseña de la base de datos
    database: process.env.DB_NAME  // Nombre de la base de datos
})
export default db

const PORT = process.env.PORT ?? 3008

const discordFlow = addKeyword<Provider, Database>('doc').addAnswer(
    ['You can see the documentation here', '📄 https://builderbot.app/docs \n', 'Do you want to continue? *yes*'].join(
        '\n'
    ),
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        if (ctx.body.toLocaleLowerCase().includes('yes')) {
            return gotoFlow(registerFlow)
        }
        await flowDynamic('Thanks!')
        return
    }
)

const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
    .addAnswer(`🙌 Hello welcome to this *Chatbot*`)
    .addAnswer(
        [
            'I share with you the following links of interest about the project',
            '👉 *doc* to view the documentation',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('doc')) {
                return fallBack('You should type *doc*')
            }
            return
        },
        [discordFlow]
    )

const registerFlow = addKeyword<Provider, Database>(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`${state.get('name')}, thanks for your information!: Your age: ${state.get('age')}`)
    })

const fullSamplesFlow = addKeyword<Provider, Database>(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow, fullSamplesFlow])
    const adapterProvider = createProvider(Provider, {
        jwtToken: JWTTOKEN,
        numberId: NUMBERID,
        verifyToken: VERIFYTOKEN,
        version: VERSION
    })
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // Ruta para recibir y almacenar mensajes entrantes
    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body

            // Guardar el mensaje en la base de datos MySQL
            await db.execute(
                'INSERT INTO messages (number, message, urlMedia) VALUES (?, ?, ?)',
                [number, message, urlMedia]
            )

            // Respuesta automática opcional
            await bot.sendMessage(number, "Message received. We'll get back to you shortly.")

            res.end('Message stored')
        })
    )

    // Ruta para obtener los mensajes almacenados en la base de datos
    adapterProvider.server.get('/v1/get-messages', async (req, res) => {
        const [messages] = await db.execute('SELECT * FROM messages ORDER BY timestamp DESC')
        res.json(messages)
    })

    // Otras rutas existentes
    adapterProvider.server.post('/v1/send-response', handleCtx(async (bot, req, res) => {
        const { number, response } = req.body
        // Envía el mensaje manualmente al usuario
        await bot.sendMessage(number, response)
        res.end('Response sent')
    }))

    httpServer(+PORT)
}
    
main()
