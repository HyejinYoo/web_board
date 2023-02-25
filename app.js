var express = require('express');
var mysql = require('mysql');
var session = require('express-session');
var bodyParser = require('body-parser');
var app = express();
const dotenv = require('dotenv');
dotenv.config();

app.use(bodyParser.urlencoded({extended: false}));
app.set('views', './views_app');
app.set('view engine', 'pug');
app.use(session({
  secret: '1234jsdkjnsdcn',
  resave: false,
  saveUninitialized: true
}));

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;
var conn = mysql.createConnection({
  host:DB_HOST,
  user:DB_USER,
  password:DB_PASSWORD,
  database:DB_DATABASE,
  multipleStatements: true
});
conn.connect();

app.get('/home/add', function(req,res){
    var displayname = req.session.displayName;
    var sql = 'SELECT id, username FROM user WHERE `displayname`=?';
    conn.query(sql, [displayname], function(err, user){
      var username = user[0].username;
      res.render('add' ,{displayname:displayname, username:username});
    });
});
app.post('/home/add', function(req, res){
  var title = req.body.title;
  var text = req.body.text;
  var writer = req.session.displayName;
  var sql = 'SELECT id FROM user WHERE `displayname`=?';
  conn.query(sql, [writer], function(err, user){
    var writerid = user[0].id;
    sql = 'INSERT INTO post (`title`, `text`, `writer`, `writerid`, `like`, `created`) VALUES (?, ?, ?, ?, 0, NOW())';
    conn.query(sql, [title, text, writer, writerid], function(err, result, fields){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.redirect('/home/'+result.insertId);
      }
    });
  });
});
app.get('/home/:id/edit', function(req, res){
    var id = parseInt(req.params.id);
    var displayname = req.session.displayName;
    if(id){
      var sql1 = 'SELECT * FROM post WHERE id=?;';
      var sql2 = 'SELECT id, username FROM user WHERE displayname=?;';
      conn.query(sql1+sql2, [id, displayname], function(err, sqlresult){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');
        }else{
          var post = sqlresult[0][0];
          var userid = sqlresult[1][0].id
          var username = sqlresult[1][0].username;
          res.render('edit', {post:post, userid:userid, displayname:displayname, username:username});
        }
      });
    }else{
      res.write("<script>alert('No permission')</script>");
      res.write("<script>window.location=\"/home\"</script>");
    }
});
app.post('/home/:id/edit', function(req, res){
  var title = req.body.title
  var text = req.body.text;
  var writer = req.session.displayName;
  var id = parseInt(req.params.id);
  var sql = 'UPDATE post SET title=?, text=?, writer=? WHERE id=?';
  conn.query(sql, [title, text, writer, id], function(err, result, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      res.redirect('/home/'+id);
    }
  });
});
app.post('/home/:id/delete', function(req,res){
  var id = parseInt(req.params.id);
  var sql1 = 'DELETE FROM post WHERE `id`=?;';
  var sql2 = 'DELETE FROM likepost WHERE `postid`=?;';
  var sql3 = 'DELETE FROM comment WHERE `postid`=?;';
  conn.query(sql1+sql2+sql3, [id, id, id], function(err, result){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      res.redirect('/home/');
    }
  });
});
app.get('/home/:id', function(req, res){
  var id = parseInt(req.params.id);
  var displayname = req.session.displayName;
  if(id){
    var sql1 = 'SELECT *, DATE_FORMAT(created, "%y-%m-%d %h:%i") AS createdtime FROM post WHERE id=?;';
    var sql2 = 'SELECT *, DATE_FORMAT(created, "%y-%m-%d %h:%i") AS createdtime FROM comment WHERE postid=? ORDER BY created ASC;';
    var sql3 = 'SELECT id, username FROM user WHERE displayname=?;';
    conn.query(sql1+sql2+sql3, [id, id, displayname], function(err, sqlresult){
      var post = sqlresult[0][0];
      var comments = sqlresult[1];
      var userid;
      var username
      if(displayname){
        userid = sqlresult[2][0].id;
        username = sqlresult[2][0].username;
      }
      var sql = 'SELECT * FROM likepost WHERE `userid`=? AND `postid`=?';
      conn.query(sql, [userid, id], function(err, userlike){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');
        }else{
          var userlike = userlike[0];
          res.render('view_post', {post:post, comments:comments, displayname:displayname, userid:userid, userlike:userlike, username:username});
        }
      });
    });
  }else{
    res.write("<script>alert('No permission')</script>");
    res.write("<script>window.location=\"/home\"</script>");
  }
});
app.get('/home', function(req, res){
  var displayname = req.session.displayName;
  var sql1 = 'SELECT *, DATE_FORMAT(created, "%y-%m-%d %h:%i") AS createdtime FROM post ORDER BY created DESC;';
  var sql2 = 'SELECT username, username FROM user WHERE displayname=?;';
  conn.query(sql1+sql2, [displayname], function(err, sqlresult, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      var posts = sqlresult[0];
      var username;
      if(sqlresult[1][0]){
        var username = sqlresult[1][0].username;
      }
      res.render('view', {posts:posts, displayname:displayname, username:username});
    }
  });
});
app.post('/home/:id/comment', function(req, res){
  var id = parseInt(req.params.id);
  var text = req.body.commenttext;
  var writer = req.session.displayName;
  if(id){
    var sql = 'SELECT id FROM user WHERE displayname=?';
    conn.query(sql, [writer], function(err, user){
      var userid = user[0].id;
      var sql = 'INSERT INTO comment (`postid`, `commentwriter`, `commentwriterid`, `commenttext`, `created`) VALUES (?, ?, ?, ?, NOW())';
      conn.query(sql, [id, writer, userid, text], function(err, result, fields){
        if(err){
          console.log(err);
          res.status(500).send('Internal Server Error');
        }else{
          res.redirect('/home/'+id);
        }
      });
    });
  }else{
    res.write("<script>alert('No permission')</script>");
    res.write("<script>window.location=\"/home\"</script>");
  }
});
app.post('/home/:id/comment/delete', function(req, res){
  var id = parseInt(req.params.id);
  var commentid = parseInt(req.body.commentid);
  var sql = 'DELETE FROM comment WHERE id=?';
  conn.query(sql, [commentid], function(err, result){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      res.redirect('/home/'+id);
    }
  });
});
app.post('/home/:id/like', function(req, res){
  var id = parseInt(req.params.id);
  var displayname = req.session.displayName;
  var likecnt = parseInt(req.body.curlike)+1;
  var sql = 'SELECT id FROM user WHERE displayname=?';
  conn.query(sql, [displayname], function(err, userid){
    var userid = userid[0].id;
    var sql1 = 'INSERT INTO likepost (`userid`, `postid`) VALUES (?, ?);';
    var sql2 = 'UPDATE post SET `like`=? WHERE `id`=?;';
    conn.query(sql1+sql2, [userid, id, likecnt, id], function(err, result){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.redirect('/home/'+id);
      }
    });
  });
});
app.post('/home/:id/deletelike', function(req, res){
  var id = parseInt(req.params.id);
  var displayname = req.session.displayName;
  var likecnt = parseInt(req.body.curlike)-1;
  var sql = 'SELECT id FROM user WHERE displayname=?';
  conn.query(sql, [displayname], function(err, user){
    var userid = user[0].id;
    sql1 = 'DELETE FROM likepost WHERE `userid`=? AND `postid`=?;';
    sql2 = 'UPDATE post SET `like`=? WHERE `id`=?;';
    conn.query(sql1+sql2, [userid, id, likecnt, id], function(err, result){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.redirect('/home/'+id);
      }
    });
  });
});
app.post('/home/:displayname/likepost', function(req, res){
  var displayname = req.params.displayname;
  var curdisplayname = req.session.displayName;
  var sql = 'SELECT id FROM user WHERE `displayname`=?'
  conn.query(sql, [displayname], function(err, user){
    var userid = user[0].id;
    var username = user[0].id;
    sql = 'SELECT *, DATE_FORMAT(created, "%y-%m-%d %h:%i") AS createdtime FROM likepost LEFT JOIN post ON likepost.postid=post.id WHERE likepost.userid=? ORDER BY post.created DESC';
    conn.query(sql, [userid], function(err, posts){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.render('likepost', {posts:posts, displayname:displayname, curdisplayname:curdisplayname, username:username});
      }
    });
  });
});
app.post('/home/:displayname/mypost', function(req, res){
  var displayname = req.params.displayname;
  var curdisplayname = req.session.displayName;
  var sql = 'SELECT id FROM user WHERE `displayname`=?';
  conn.query(sql, [displayname], function(err, user){
    var userid = user[0].id;
    var username = user[0].id;
    sql = 'SELECT * FROM post WHERE post.writerid=? ORDER BY created DESC';
    conn.query(sql, [userid], function(err, posts){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.render('mypost', {posts:posts, displayname:displayname, curdisplayname:curdisplayname, username:username});
      }
    });
  });
});
app.post('/home/search', function(req, res){
  var displayname = req.session.displayName;
  var keyword = req.body.keyword;
  var crit = req.body.crit;
  var sql = 'SELECT *, DATE_FORMAT(created, "%y-%m-%d %h:%i") AS createdtime FROM post WHERE '+crit+' LIKE ? ORDER BY created DESC'
  if(crit==='title' || crit==='text' || crit==='writer'){
    conn.query(sql, ['%'+keyword+'%'], function(err, posts){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.render('search', {posts:posts, displayname:displayname});
      }
    });
  }
  else{
    res.write("<script>alert('No permission')</script>");
    res.write("<script>window.location=\"/home\"</script>");
  }
});
app.get('/change_name', function(req, res){
  res.render('change_name');
});
app.post('/change_name', function(req, res){
  var displayname = req.session.displayName;
  var newname = req.body.newname;
  var pwd = req.body.password;
  var sql = 'SELECT * FROM user WHERE displayname=?';
  conn.query(sql, [displayname], function(err, user){
    if(user[0]){
      var userid = user[0].id;
      var userpwd = user[0].password;
      if(pwd===userpwd){
        sql = 'SELECT id FROM user WHERE `displayname`=?';
        conn.query(sql, [newname], function(err, user){
          if(user[0]){
            res.send('This name already exists.');
          }
          else{
            sql = 'UPDATE user SET `displayname`=? WHERE `id`=?';
            conn.query(sql, [newname, userid], function(err, result){
              if(err){
                console.log(err);
                res.status(500).send('Internal Server Error');
              }else{
                req.session.displayName = newname;
                res.redirect('/home');
              }
            });
          }
        });
      }
      else{
        res.write("<script>alert('Wrong password')</script>");
        res.write("<script>window.location=\"/change_pwd\"</script>");
      }
    }else{
      res.write("<script>alert('No permission')</script>");
      res.write("<script>window.location=\"/home\"</script>");
    }
  });
});
app.get('/change_pwd', function(req, res){
  res.render('change_pwd');
});
app.post('/change_pwd', function(req, res){
  var displayname = req.session.displayName;
  var newpwd = req.body.newpwd;
  var pwd = req.body.password;
  var sql = 'SELECT * FROM user WHERE displayname=?';
  conn.query(sql, [displayname], function(err, user){
    if(user[0]){
      var userid = user[0].id;
      var userpwd = user[0].password;
      if(pwd===userpwd){
        sql = 'UPDATE user SET `password`=? WHERE `id`=?';
        conn.query(sql, [newpwd, userid], function(err, result){
          if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
          }else{
            res.redirect('/home');
          }
        });
      }
      else{
        res.write("<script>alert('Wrong password')</script>");
        res.write("<script>window.location=\"/change_pwd\"</script>");
      }
    }else{
      res.write("<script>alert('No permission')</script>");
      res.write("<script>window.location=\"/home\"</script>");
    }
  });
});
app.get('/login', function(req, res){
  res.render('login');
})
app.post('/login', function(req, res){
  var sql = 'SELECT * FROM user WHERE username=?';
  conn.query(sql, [req.body.username], function(err, user, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      var user = user[0];
      if(user && user.password===req.body.password){
        req.session.displayName = user.displayname;
        return req.session.save(function(){
          res.redirect('/home');
        });
      }else{
        res.write("<script>alert('invalid username or password.')</script>");
        res.write("<script>window.location=\"/login\"</script>");
      }
    }
  });
});
app.get('/logout', function(req, res){
  delete req.session.displayName;
  return req.session.save(function(){
    res.redirect('/home');
  });
});
app.get('/join', function(req, res){
  res.render('join');
});
app.post('/join', function(req, res){
  var sql1 = 'SELECT * FROM user WHERE username=?;';
  var sql2 = 'SELECT * FROM user WHERE displayname=?;';
  conn.query(sql1+sql2, [req.body.username, req.body.displayname], function(err, users, fields){
    if(err){
      console.log(err);
      res.status(500).send('Internal Server Error');
    }else{
      if(users[0][0]){
        res.write("<script>alert('This username has already been registered.')</script>");
        res.write("<script>window.location=\"/join\"</script>");
      }else if(users[1][0]){
        res.write("<script>alert('This displayname has already been registered.')</script>");
        res.write("<script>window.location=\"/join\"</script>");
      }else{
        var sql = 'INSERT INTO user (`username`, `displayname`, `password`) VALUES (?, ?, ?)';
        conn.query(sql, [req.body.username, req.body.displayname, req.body.password], function(err, result, fields){
          if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
          }else{
            res.write("<script>alert('Sign up is complete!')</script>");
            res.write("<script>window.location=\"/login\"</script>");
          }
        });
      }
    }
  });
});


app.listen(3000, function(req, res){
  console.log('Connected 3000 port');
});
