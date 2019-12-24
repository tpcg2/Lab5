import express = require('express')
import { MetricsHandler, Metric } from './metrics'
import path = require('path')
import bodyparser = require('body-parser')
import session = require('express-session')
import levelSession = require('level-session-store')
import { UserHandler, User } from './user'
import morgan = require('morgan')
import { SSL_OP_EPHEMERAL_RSA } from 'constants'

const app = express()
const port: string = process.env.PORT || '8082'
var id ='';
app.use(express.static(path.join(__dirname, '/../public')))

app.set('views', __dirname + "/../views")
app.set('view engine', 'ejs');

app.use(bodyparser.json())
app.use(bodyparser.urlencoded())
app.use(morgan('dev'))

app.get('/', (req: any, res: any) => {
  res.write('Hello world')
  res.end()
})

app.get('/hello/:name', (req: any, res: any) => {
  res.render('index.ejs', { name: req.params.name })
})

/* Metrics part */

const dbMet: MetricsHandler = new MetricsHandler('./db/metrics')

app.post('/addmetrics', (req: any, res: any) => {
  dbMet.save(id, [new Metric(""+Math.random()*1000,req.body.value)] , (err: Error | null) => {
    if (err) throw err
    res.redirect('/index')
  })
})

app.get('/metrics/', (req: any, res: any) => {
  dbMet.getAll(
    (err: Error | null, result: any) => {
      if (err) throw err
      res.status(200).send(result)
    })
})

app.get('/show', (req: any, res: any) => {
  dbMet.get1(
    id, (err: Error | null, result: any) => {
      if (err) throw err
      res.status(200).send(result)
    })
})

app.delete('/delete', (req: any, res: any) => {
  dbMet.delete(
    req.params.name, req.body, (err: Error | null) => {
      if (err) throw err
      res.status(200).send('ok')
    })
})

app.listen(port, (err: Error) => {
  if (err) {
    throw err
  }
  console.log(`Server is running on http://localhost:${port}`)
})

/* User */

const LevelStore = levelSession(session)

app.use(session({
  secret: 'my very secret phrase',
  store: new LevelStore('./db/sessions'),
  resave: true,
  saveUninitialized: true
}))


const dbUser: UserHandler = new UserHandler('./db/users')
const authRouter = express.Router()

authRouter.get('/login', (req: any, res: any) => {
  res.render('login')
})

authRouter.get('/index', (req: any, res: any) => {
  res.render('index')
})

authRouter.get('/signup', (req: any, res: any) => {
  res.render('signup')
})

authRouter.get('/addmetric', (req: any, res: any) => {
  res.render('addmetric')
})

authRouter.get('/showmetrics', (req: any, res: any) => {
  res.render('showmetric')
})

authRouter.get('/logout', (req: any, res: any) => {
  delete req.session.loggedIn
  delete req.session.user
  res.redirect('login')
})



app.post('/login', (req: any, res: any, next: any) => {
  dbUser.get(req.body.username, (err: Error | null, result?: User) => {
    if (err) next(err)
    if (result === undefined || !result.validatePassword(req.body.password)) {
      res.redirect('/login')
    } else {
      req.session.loggedIn = true
      req.session.user = result
      id=req.body.username
      res.redirect('/index')
    }
  })
})

app.use(authRouter)
const userRouter = express.Router()

userRouter.post('/', (req: any, res: any, next: any) => {
  dbUser.get(req.body.username, function (err: Error | null, result?: User) {
    if (!err || result !== undefined) {
      res.status(409).send("user already exists")
    } else {
      dbUser.save(req.body, function (err: Error | null) {

        if (err) next(err)

        else res.status(201).send("user persisted")
      })
    }
  })
})

userRouter.get('/:username', (req: any, res: any, next: any) => {
  dbUser.get(req.params.username, function (err: Error | null, result?: User) {
    if (err || result === undefined) {
      res.status(404).send("user not found")
    } else res.status(200).json(result)
  })
})

app.use('/user', userRouter)


const authCheck = function (req: any, res: any, next: any) {
  if (req.session.loggedIn) {
    next()
  } else res.redirect('/login')
}

app.get('/', authCheck, (req: any, res: any) => {
  res.render('index', { name: req.session.username })
  res.write("azertyuiop")
})

app.post('/src/user.ts',(req: any, res: any) => {
  dbUser.save(new User(req.params.username,req.params.email,req.params.password,false), (err: Error | null) => {
    if (err) throw err
    res.redirect('/index')
  })
})

app.get('/user/:name', (req: any, res: any) => {
  dbUser.get(
    req.params.name, (err: Error | null, result: any) => {
      if (err) throw err
      res.status(200).send(result)
    })
})