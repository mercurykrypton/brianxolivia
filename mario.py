def main():
    square_size = int(input("how big is the square?\n"))
    square(square_size)


def square(size):
    for i in range (size):
        print("#" * size)

main()