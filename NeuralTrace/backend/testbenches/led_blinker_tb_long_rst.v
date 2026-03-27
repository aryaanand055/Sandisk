`timescale 1ns / 1ps
module led_blinker_tb_long_rst;
    reg clk;
    reg reset;
    wire led;

    led_blinker uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #1000 reset = 0;
        #500 $finish;
    end
endmodule
