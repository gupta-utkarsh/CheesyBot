import numpy as np
import datetime

def generate_data():
	distribution = np.random.choice(np.arange(1,14), 270, p = [0.11,0.05,0.09,0.07,0.07,0.06,0.09,0.05,0.08,0.13,0.09,0.05,0.06])
	user_id = '1'
	init_time = 1488627079
	with open('userdata', 'w') as f:
		for i in range(0,270):
			time = datetime.datetime.fromtimestamp(init_time+10*i).strftime("%Y/%m/%dT%H:%M:%S")
			f.write(user_id + ',' + str(distribution[i]) + ',' + time + '\n')

def main():
	generate_data()

if __name__ == '__main__':
	main()

