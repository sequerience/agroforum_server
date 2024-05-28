import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import * as fs from 'node:fs';

const app = express();
const secretKey = 'your-secret-key'; // Replace with your actual secret key
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
}));
app.use(cookieParser());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    next();
  });


function authenticateToken(req, res, next) { //юзаем вместо verifyUser
    const token = req.headers.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decoded.username;
        next();
    });
}

// Защищенный маршрут для получения информации о пользователе
app.get('/view-account', authenticateToken, (req, res) => {
    const usersData = JSON.parse(fs.readFileSync('./users.json', 'utf8'));


    const username = req.user;

    if (usersData[username]) {
        const { email, first_name } = usersData[username];
        res.json({
            username,
            email,
            first_name,
        });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

app.post('/login', (req, res) => {

    const usersData = JSON.parse(fs.readFileSync('./users.json', 'utf8'));

    const { username } = req.body;

    // Check if the username exists in your data
    if (usersData[username]) {
        // Generate a JWT token
        const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });

        // Send the token back to the Android app
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid username' });
    }
});

app.post('/add-user', (req, res) => {
    const formData = req.body; // Получаем данные из запроса

    // Записываем данные в файл data.json
    fs.readFile('./users.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла users.json:', err);
            return res.status(500).send('Ошибка сервера');
        }

        let users = {}; // Создаем пустой объект для хранения пользователей

        try {
            users = JSON.parse(data); // Пытаемся прочитать существующие данные
        } catch (parseError) {
            console.error('Ошибка при разборе файла users.json:', parseError);
            return res.status(500).send('Ошибка сервера');
        }

        // Добавляем нового пользователя в объект users
        users[formData.username] = {
            email: formData.email,
            first_name: formData.first_name
        };
        console.log(formData)
        // Записываем обновленные данные обратно в файл data.json
        fs.writeFile('./data.json', JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error('Ошибка при записи файла users.json:', writeErr);
                return res.status(500).send('Ошибка сервера');
            }
            console.log('Данные успешно записаны в users.json');
            res.send('Данные успешно записаны в users.json');
        });
    });
});


// Обработчик для маршрута /add-event
app.post('/add-event', (req, res) => {
    const formData = req.body; // Получаем данные из запроса

    // Загружаем существующие данные из events.json
    fs.readFile('./events.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла events.json:', err);
            return res.status(500).send('Ошибка сервера');
        }

        let events = {}; // Создаем пустой объект для хранения мероприятий

        try {
            events = JSON.parse(data); // Пытаемся прочитать существующие данные
        } catch (parseError) {
            console.error('Ошибка при разборе файла events.json:', parseError);
            return res.status(500).send('Ошибка сервера');
        }

        // Добавляем новое мероприятие в объект events
        events[formData.eventName] = {
            tutors: formData.tutors, //фио тьюторов
            date: formData.date, //дата проведения
            description: formData.description, //описание
            duration: formData.duration, //длительность мероприятия
            guests: 0, //количество гостей
        };

        // Записываем обновленные данные обратно в файл events.json
        fs.writeFile('./events.json', JSON.stringify(events, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error('Ошибка при записи файла events.json:', writeErr);
                return res.status(500).send('Ошибка сервера');
            }
            console.log('Данные успешно записаны в events.json');
            res.send('Данные успешно записаны в events.json');
        });
    });
});

app.get('/view-events', (req, res) => {
    // Читаем данные из файла events.json
    fs.readFile('./events.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла events.json:', err);
            return res.status(500).send('Ошибка сервера');
        }

        try {
            const events = JSON.parse(data); // Преобразуем данные в объект
            // Теперь у вас есть объект events, содержащий информацию о мероприятиях
            // Вы можете отправить его в ответ на запрос
            res.send(events);
        } catch (parseError) {
            console.error('Ошибка при разборе файла events.json:', parseError);
            return res.status(500).send('Ошибка сервера');
        }
    });
});

app.post('/subscribe-event', authenticateToken, async (req, res) => {
    const username = req.user; // Используем корректное имя пользователя из токена
    const { eventName } = req.body;

    fs.readFile('./events.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла events.json:', err);
            return res.status(500).send('Ошибка сервера');
        }

        let events = {};
        try {
            events = JSON.parse(data);
        } catch (parseError) {
            console.error('Ошибка при разборе файла events.json:', parseError);
            return res.status(500).send('Ошибка сервера');
        }
        if (!events[eventName]) {
            return res.status(404).send('Мероприятие не найдено');
        }
        events[eventName].guests += 1;

        // Записываем обновленные данные обратно в файл events.json
        fs.writeFile('./events.json', JSON.stringify(events, null, 2), 'utf8', (writeEventsErr) => {
            if (writeEventsErr) {
                console.error('Ошибка при записи файла events.json:', writeEventsErr);
                return res.status(500).send('Ошибка сервера');
            }
            console.log('Данные успешно обновлены в events.json');
        });

        // Загружаем существующие данные из users.json
        fs.readFile('./users.json', 'utf8', (userErr, userData) => {
            if (userErr) {
                console.error('Ошибка при чтении файла users.json:', userErr);
                return res.status(500).send('Ошибка сервера');
            }

            let users = {}; // Создаем пустой объект для хранения пользователей

            try {
                users = JSON.parse(userData); // Пытаемся прочитать существующие данные
            } catch (userParseError) {
                console.error('Ошибка при разборе файла users.json:', userParseError);
                return res.status(500).send('Ошибка сервера');
            }

            // Обновляем информацию о мероприятии у пользователя
            if (!users[username]) {
                users[username] = {
                    email: '', // Здесь вы можете добавить email пользователя
                    first_name: '', // Здесь вы можете добавить имя пользователя
                    events: {},
                };
            }
            users[username].events[eventName] = events[eventName].description;

            // Записываем обновленные данные обратно в файл users.json
            fs.writeFile('./users.json', JSON.stringify(users, null, 2), 'utf8', (writeUserErr) => {
                if (writeUserErr) {
                    console.error('Ошибка при записи файла users.json:', writeUserErr);
                    return res.status(500).send('Ошибка сервера');
                }
                console.log('Данные успешно обновлены в users.json');
                res.send('Подписка на мероприятие успешно выполнена');
            });
        });
    });
})

app.post('/unsubscribe-event', authenticateToken, async (req, res) => {
    const username = req.header.username;
    const { eventName } = req.body;

    // Загружаем существующие данные из events.json
    fs.readFile('./events.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла events.json:', err);
            return res.status(500).send('Ошибка сервера');
        }

        let events = {}; // Создаем пустой объект для хранения мероприятий

        try {
            events = JSON.parse(data); // Пытаемся прочитать существующие данные
        } catch (parseError) {
            console.error('Ошибка при разборе файла events.json:', parseError);
            return res.status(500).send('Ошибка сервера');
        }

        // Проверяем, что мероприятие с таким именем существует
        if (!events[eventName]) {
            return res.status(404).send('Мероприятие не найдено');
        }

        // Уменьшаем количество гостей у мероприятия
        events[eventName].guests -= 1;

        // Записываем обновленные данные обратно в файл events.json
        fs.writeFile('./events.json', JSON.stringify(events, null, 2), 'utf8', (writeEventsErr) => {
            if (writeEventsErr) {
                console.error('Ошибка при записи файла events.json:', writeEventsErr);
                return res.status(500).send('Ошибка сервера');
            }
            console.log('Данные успешно обновлены в events.json');
        });

        // Загружаем существующие данные из users.json
        fs.readFile('./users.json', 'utf8', (userErr, userData) => {
            if (userErr) {
                console.error('Ошибка при чтении файла users.json:', userErr);
                return res.status(500).send('Ошибка сервера');
            }

            let users = {}; // Создаем пустой объект для хранения пользователей

            try {
                users = JSON.parse(userData); // Пытаемся прочитать существующие данные
            } catch (userParseError) {
                console.error('Ошибка при разборе файла users.json:', userParseError);
                return res.status(500).send('Ошибка сервера');
            }

            // Удаляем информацию о мероприятии у пользователя
            if (users[username] && users[username].events[eventName]) {
                delete users[username].events[eventName];
            }

            // Записываем обновленные данные обратно в файл users.json
            fs.writeFile('./users.json', JSON.stringify(users, null, 2), 'utf8', (writeUserErr) => {
                if (writeUserErr) {
                    console.error('Ошибка при записи файла users.json:', writeUserErr);
                    return res.status(500).send('Ошибка сервера');
                }
                console.log('Данные успешно обновлены в users.json');
                res.send('Отписка от мероприятия успешно выполнена');
            });
        });
    });
});

app.listen(8000, () => {
    console.log(`Server is running on PORT: ${8000}`);
})
