%删除原ArangoDB服务%
sc delete "ArangoDB"
%以10线程启动ArangoDB并且加入服务%
sc create ArangoDB binPath= "C:/Program Files/ArangoDB 2.8.10/bin/arangod.exe --start-service --server.thread 10" TYPE= "own" start= "auto" TAG= "no" DisplayName= "ArangoDB service"