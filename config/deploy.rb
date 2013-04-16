set :application, "bot.pomeo.ru"
#========================
#CONFIG
#========================
require           "capistrano-offroad"
offroad_modules   "defaults", "supervisord"

default_run_options[:pty] = true
default_run_options[:shell] = '/bin/bash'
set :repository,  "git@github.com:pomeo/bot-calendar.git"
set :user,        "pomeo"
set :port,        2222
set :use_sudo,    false
set :deploy_via,  :copy
set :scm,         :git
set :copy_exclude,["/.git/", "/.gitignore", "/Capfile", "/config/", "/config.yaml", "/Rakefile", "Rules", "/tmp/", "/mkmf.log"]

set :supervisord_pidfile, "/var/run/supervisord.pid"
set :supervisord_start_group, "botcal"
set :supervisord_stop_group, "botcal"
#========================
#ROLES
#========================
role :app,        "#{application}"
set :deploy_to,   "/var/www/pomeo.ru/bot"
set :deploy_user, "pomeo"
set :deploy_group,"pomeo"

namespace :deploy do 
  desc "Install node modules non-globally"
  task :npm_install do
    run ". /home/pomeo/.nvm/nvm.sh && cd #{current_path} && npm install"
  end

  desc "Change node.js port"
  task :chg_port do
    run "sed -i 's/3000/4150/g' #{current_path}/app.js"
  end
end
 
after "deploy:create_symlink", "deploy:npm_install", "deploy:chg_port", "deploy:restart"
