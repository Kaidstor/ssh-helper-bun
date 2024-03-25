# Установка 

echo "alias tun='sudo bun $(pwd)/index.ts'" >> ~/.bashrc
source ~/.bashrc

# Зависимости

## bun
- curl -fsSL https://bun.sh/install | bash
## tmux
- sudo apt install tmux

# Команды

## tun ls
- Выводит список открытых туннелей
## tun close {host}
- Закрывает тунель
## tun {host} {port}
- Прокидывает порт с указанного хоста на локальный


## tun hosts
- Список хостов
## tun add
- Добавление хоста в ~/.ssh/config
